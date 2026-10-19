import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection, IEmbeddingFunction } from 'chromadb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PromptTemplate } from '@langchain/core/prompts';
import {
  RunnableLike,
  RunnableSequence,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { createGeminiChatModel } from '../llm/gemini-chat';
import {
  average,
  keywordHitRate,
  percentile,
  round4,
  splitTextIntoChunks,
  unsupportedClaim,
} from './eval.metrics';
import {
  CaseEvalResult,
  EvalStatus,
  EvalSummary,
  GoldDataset,
} from './eval.types';

const COLLECTION_NAME = 'eval_gold';
const CHUNK_TOKENS = 180;

const goldSchema = z.object({
  version: z.string(),
  description: z.string(),
  nResults: z.number().int().positive(),
  documents: z
    .array(
      z.object({
        cvId: z.string(),
        label: z.string(),
        text: z.string().min(20),
      }),
    )
    .min(5),
  cases: z
    .array(
      z.object({
        id: z.string(),
        cvId: z.string(),
        question: z.string(),
        goldAnswer: z.string(),
        relevantKeywords: z.array(z.string()).min(1),
        answerKeywords: z.array(z.string()).min(1),
        forbiddenPhrases: z.array(z.string()),
        answerMatch: z.enum(['all', 'any']).optional(),
        expectAbstain: z.boolean().optional(),
      }),
    )
    .min(25),
});

const judgeSchema = z.object({
  grounded: z.boolean(),
  relevant: z.boolean(),
  score: z.number().min(1).max(5),
});

class GeminiEmbeddingFunction implements IEmbeddingFunction {
  private readonly logger = new Logger(GeminiEmbeddingFunction.name);
  private readonly client: GoogleGenerativeAI | null;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('GEMINI_API_KEY');
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async generate(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is required for embeddings');
    }
    const model = this.client.getGenerativeModel({
      model: 'gemini-embedding-001',
    });
    const embeddings: number[][] = [];
    for (const text of texts) {
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    }
    this.logger.log(`Eval embeddings generated for ${texts.length} texts`);
    return embeddings;
  }
}

@Injectable()
export class EvalService {
  private readonly logger = new Logger(EvalService.name);
  private readonly embeddingFunction: IEmbeddingFunction;
  private collection: Collection | null = null;

  constructor(
    private readonly chromaClient: ChromaClient,
    private readonly configService: ConfigService,
  ) {
    this.embeddingFunction = new GeminiEmbeddingFunction(configService);
  }

  async run(includeJudge = false): Promise<EvalSummary> {
    const dataset = this.loadDataset();
    const collection = await this.seedCollection(dataset);
    const saved = this.loadSavedCases(dataset.version);
    const cases: CaseEvalResult[] = [];
    let stoppedReason: string | null = null;

    for (const goldCase of dataset.cases) {
      const previous = saved[goldCase.id];
      if (previous && (previous.status === 'PASS' || previous.status === 'FAIL')) {
        cases.push(previous);
        continue;
      }
      if (stoppedReason) {
        cases.push(this.notRun(goldCase, stoppedReason));
        continue;
      }
      const result = await this.evaluateCase(
        collection,
        dataset.nResults,
        goldCase,
        includeJudge,
      );
      cases.push(result);
      this.saveCases(dataset.version, cases);
      if (result.status === 'ERROR' && this.isQuotaError(result.error)) {
        stoppedReason = result.error ?? 'Gemini quota exhausted';
      }
    }
    this.saveCases(dataset.version, cases);
    return this.summarize(dataset.version, cases, stoppedReason);
  }

  private loadDataset(): GoldDataset {
    const candidates = [
      path.join(__dirname, 'datasets', 'cv-rag-gold.json'),
      path.join(process.cwd(), 'src', 'eval', 'datasets', 'cv-rag-gold.json'),
      path.join(
        process.cwd(),
        'apps',
        'backend',
        'src',
        'eval',
        'datasets',
        'cv-rag-gold.json',
      ),
    ];
    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!filePath) {
      throw new ServiceUnavailableException(
        'RAG gold dataset was not found next to the eval module',
      );
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return goldSchema.parse(parsed);
  }

  private async seedCollection(dataset: GoldDataset): Promise<Collection> {
    const expectedChunks = dataset.documents.reduce(
      (sum, cv) => sum + splitTextIntoChunks(cv.text, CHUNK_TOKENS).length,
      0,
    );
    try {
      const existing = await this.chromaClient.getCollection({
        name: COLLECTION_NAME,
        embeddingFunction: this.embeddingFunction,
      });
      const cachedVersion = String(existing.metadata?.datasetVersion ?? '');
      const cachedCount = await existing.count();
      if (cachedVersion === dataset.version && cachedCount === expectedChunks) {
        this.logger.log(
          `Reusing ${cachedCount} cached eval embeddings for dataset ${dataset.version}`,
        );
        this.collection = existing;
        return existing;
      }
      await this.chromaClient.deleteCollection({ name: COLLECTION_NAME });
    } catch {
      this.logger.debug('Eval collection will be created');
    }

    this.collection = await this.chromaClient.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: this.embeddingFunction,
      metadata: { datasetVersion: dataset.version },
    });

    const ids: string[] = [];
    const documents: string[] = [];
    const metadatas: { cvId: string; chunkIndex: number }[] = [];
    const chunkTexts: string[] = [];
    for (const cv of dataset.documents) {
      const chunks = splitTextIntoChunks(cv.text, CHUNK_TOKENS);
      chunks.forEach((chunk, index) => {
        ids.push(`${cv.cvId}_chunk_${index}`);
        chunkTexts.push(chunk);
        documents.push(
          JSON.stringify({
            chunkIndex: index,
            text: chunk,
            cvId: cv.cvId,
            label: cv.label,
          }),
        );
        metadatas.push({ cvId: cv.cvId, chunkIndex: index });
      });
    }
    const embeddings = await this.embeddingFunction.generate(chunkTexts);
    await this.collection.add({ ids, documents, metadatas, embeddings });
    this.logger.log(
      `Seeded ${chunkTexts.length} gold chunks from ${dataset.documents.length} CVs into ${COLLECTION_NAME}`,
    );
    return this.collection;
  }

  private async evaluateCase(
    collection: Collection,
    nResults: number,
    goldCase: GoldDataset['cases'][number],
    includeJudge: boolean,
  ): Promise<CaseEvalResult> {
    const started = Date.now();
    try {
      const retrievalStarted = Date.now();
      const queryEmbedding = (
        await this.withTimeout(
          this.embeddingFunction.generate([goldCase.question]),
          30_000,
          'Query embedding',
        )
      )[0];
      const queryResult = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
      });
      const retrievalLatencyMs = Date.now() - retrievalStarted;

      const context = (queryResult.documents[0] || [])
        .map((doc) => {
          try {
            return JSON.parse(doc || '{}').text || '';
          } catch {
            return doc || '';
          }
        })
        .filter(Boolean)
        .join('\n\n');

      const retrievalHitRate = keywordHitRate(
        context,
        goldCase.relevantKeywords,
      );

      const generationStarted = Date.now();
      const answer = await this.withTimeout(
        this.generateAnswer(context, goldCase.question),
        60_000,
        'Gemini answer',
      );
      const generationLatencyMs = Date.now() - generationStarted;

      const answerHitRate = keywordHitRate(
        answer,
        goldCase.answerKeywords,
        goldCase.answerMatch ?? 'all',
      );
      const faithfulness = unsupportedClaim(
        answer,
        context,
        goldCase.forbiddenPhrases,
      )
        ? 0
        : 1;
      const abstention = goldCase.expectAbstain
        ? answerHitRate === 1 && faithfulness === 1
          ? 1
          : 0
        : null;

      let judge: CaseEvalResult['judge'];
      if (includeJudge) {
        judge = await this.judgeAnswer(context, goldCase.question, answer);
      }

      const passed =
        retrievalHitRate >= 0.6 &&
        answerHitRate >= 0.5 &&
        faithfulness === 1 &&
        (abstention === null || abstention === 1) &&
        (!judge || (judge.grounded && judge.relevant && judge.score >= 3));
      const status: EvalStatus = passed ? 'PASS' : 'FAIL';

      return {
        id: goldCase.id,
        cvId: goldCase.cvId,
        question: goldCase.question,
        goldAnswer: goldCase.goldAnswer,
        status,
        passed,
        retrievalHitRate: round4(retrievalHitRate),
        answerHitRate: round4(answerHitRate),
        faithfulness,
        abstention,
        retrievalLatencyMs,
        generationLatencyMs,
        totalLatencyMs: Date.now() - started,
        retrievedPreview: context.slice(0, 280),
        answerPreview: answer.slice(0, 280),
        judge,
      };
    } catch (error) {
      this.logger.error(
        `Eval case ${goldCase.id} failed`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        id: goldCase.id,
        cvId: goldCase.cvId,
        question: goldCase.question,
        goldAnswer: goldCase.goldAnswer,
        status: 'ERROR',
        passed: false,
        retrievalHitRate: null,
        answerHitRate: null,
        faithfulness: null,
        abstention: null,
        retrievalLatencyMs: 0,
        generationLatencyMs: 0,
        totalLatencyMs: Date.now() - started,
        retrievedPreview: '',
        answerPreview: '',
        error: this.readableEvalError(error),
      };
    }
  }

  private summarize(
    datasetVersion: string,
    cases: CaseEvalResult[],
    stoppedReason: string | null,
  ): EvalSummary {
    const completed = cases.filter(
      (item) => item.status === 'PASS' || item.status === 'FAIL',
    );
    const passCount = completed.filter((item) => item.status === 'PASS').length;
    const retrievalScores = completed.map((item) => item.retrievalHitRate ?? 0);
    const answerScores = completed.map((item) => item.answerHitRate ?? 0);
    const faithfulnessScores = completed.map((item) => item.faithfulness ?? 0);
    const abstentions = completed
      .map((item) => item.abstention)
      .filter((value): value is number => value !== null);
    const latencies = completed.map((item) => item.totalLatencyMs);
    const ratio = (count: number, total: number) =>
      total === 0 ? null : round4(count / total);

    return {
      ranAt: new Date().toISOString(),
      datasetVersion,
      caseCount: cases.length,
      completedCount: completed.length,
      passCount,
      failCount: completed.length - passCount,
      errorCount: cases.filter((item) => item.status === 'ERROR').length,
      notRunCount: cases.filter((item) => item.status === 'NOT_RUN').length,
      passRate: ratio(passCount, completed.length),
      retrievalHitRate: completed.length ? round4(average(retrievalScores)) : null,
      answerHitRate: completed.length ? round4(average(answerScores)) : null,
      faithfulness: completed.length
        ? round4(average(faithfulnessScores))
        : null,
      abstention: abstentions.length ? round4(average(abstentions)) : null,
      errorRate: round4(
        cases.filter((item) => item.status === 'ERROR').length / cases.length,
      ),
      stoppedReason,
      latencyMs: {
        avg: Math.round(average(latencies)),
        p50: Math.round(percentile(latencies, 50)),
        p95: Math.round(percentile(latencies, 95)),
      },
      cases,
    };
  }

  private notRun(
    goldCase: GoldDataset['cases'][number],
    reason: string,
  ): CaseEvalResult {
    return {
      id: goldCase.id,
      cvId: goldCase.cvId,
      question: goldCase.question,
      goldAnswer: goldCase.goldAnswer,
      status: 'NOT_RUN',
      passed: false,
      retrievalHitRate: null,
      answerHitRate: null,
      faithfulness: null,
      abstention: null,
      retrievalLatencyMs: 0,
      generationLatencyMs: 0,
      totalLatencyMs: 0,
      retrievedPreview: '',
      answerPreview: '',
      error: reason,
    };
  }

  private isQuotaError(message?: string): boolean {
    return /quota exceeded|free-tier quota/i.test(message ?? '');
  }

  private resultsPath(version: string): string {
    return path.join(process.cwd(), 'eval-runs', `rag-${version}.json`);
  }

  private loadSavedCases(version: string): Record<string, CaseEvalResult> {
    const filePath = this.resultsPath(version);
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
        cases?: CaseEvalResult[];
      };
      return Object.fromEntries(
        (parsed.cases ?? [])
          .filter((item) => item.status === 'PASS' || item.status === 'FAIL')
          .map((item) => [item.id, item]),
      );
    } catch {
      this.logger.warn('Could not read saved eval results; starting fresh');
      return {};
    }
  }

  private saveCases(version: string, cases: CaseEvalResult[]) {
    const filePath = this.resultsPath(version);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({ datasetVersion: version, cases }, null, 2),
    );
  }

  private readableEvalError(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Unknown eval error';
    if (/429|quota|rate limit/i.test(message)) {
      return 'Gemini free-tier quota exceeded (20 requests). Wait a minute, then run the evaluation again.';
    }
    return message;
  }

  private async withTimeout<T>(
    work: Promise<T>,
    ms: number,
    label: string,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
        ms,
      );
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async generateAnswer(
    context: string,
    question: string,
  ): Promise<string> {
    const llm = createGeminiChatModel(this.configService, 0.7, 0);
    const promptTemplate = PromptTemplate.fromTemplate(`
        You are an AI assistant answering questions about a candidate's CV. Use the following CV content to provide an accurate and concise response. If the information is not available, state so clearly.
  
        CV Content:
        {context}
  
        User Question: {question}
  
        Response:
      `);
    const chain = RunnableSequence.from([
      promptTemplate,
      llm as unknown as RunnableLike<any, any>,
      new StringOutputParser(),
    ]);
    return chain.invoke({ context, question });
  }

  private async judgeAnswer(
    context: string,
    question: string,
    answer: string,
  ): Promise<CaseEvalResult['judge']> {
    const llm = createGeminiChatModel(this.configService, 0, 0);
    const promptTemplate = PromptTemplate.fromTemplate(`
        You evaluate a RAG answer. Use only the context. Return JSON with no markdown.
        {{
          "grounded": true,
          "relevant": true,
          "score": 4
        }}
        grounded: every factual claim in the answer is supported by the context, or the answer clearly says the information is missing.
        relevant: the answer addresses the question.
        score: integer from 1 to 5.

        Context:
        {context}

        Question: {question}

        Answer:
        {answer}
      `);
    const chain = RunnableSequence.from([
      promptTemplate,
      llm as unknown as RunnableLike<any, any>,
      new StringOutputParser(),
    ]);
    const raw = await chain.invoke({ context, question, answer });
    const cleaned = raw
      .replace(/```json\n?/, '')
      .replace(/```/, '')
      .trim();
    return judgeSchema.parse(JSON.parse(cleaned));
  }
}
