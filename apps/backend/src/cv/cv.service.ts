import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChromaClient, Collection, IEmbeddingFunction, Where } from 'chromadb';
import { ChatCvDto } from './dto/chat-cv.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';
import pdfParse = require('pdf-parse');
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import * as crypto from 'crypto';
import * as sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';

class GeminiEmbeddingFunction implements IEmbeddingFunction {
  private readonly logger = new Logger(GeminiEmbeddingFunction.name);
  private readonly client: GoogleGenerativeAI;

  constructor(configService: ConfigService) {
    const GEMINI_API_KEY = configService.get<string>('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      this.logger.error('GEMINI_API_KEY is not defined in .env');
      throw new Error('GEMINI_API_KEY is required');
    }
    this.client = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.logger.log('Gemini client initialized successfully');
  }

  async generate(texts: string[]): Promise<number[][]> {
    try {
      const model = this.client.getGenerativeModel({
        model: 'text-embedding-004',
      });
      const embeddings: number[][] = [];
      for (const text of texts) {
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        embeddings.push(embedding);
      }
      this.logger.log(`Generated embeddings for ${texts.length} texts`);
      return embeddings;
    } catch (error) {
      this.logger.error(
        'Failed to generate embeddings',
        error.stack,
        error.message,
      );
      throw new Error('Gemini embedding generation failed');
    }
  }
}

@Injectable()
export class CvService {
  private cvCollection: Collection;
  private userCollection: Collection;
  private chatHistoryCollection: Collection;
  private quizCollection: Collection;
  private readonly logger = new Logger(CvService.name);
  private readonly embeddingFunction: IEmbeddingFunction;
  private readonly uploadFolder = path.join(__dirname, '..', 'Cvfiles');

  constructor(
    private readonly chromaClient: ChromaClient,
    private readonly configService: ConfigService,
  ) {
    this.embeddingFunction = new GeminiEmbeddingFunction(configService);
    this.chromaClient = new ChromaClient({ path: 'http://chromadb:8000' });

    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      this.logger.error('SENDGRID_API_KEY is not defined in .env');
      throw new Error('SENDGRID_API_KEY is required');
    }
    sgMail.setApiKey(sendgridApiKey);
    this.initializeCollections();
  }

  private async initializeCollections() {
    try {
      this.cvCollection = await this.chromaClient.getOrCreateCollection({
        name: 'cvs',
        embeddingFunction: this.embeddingFunction,
      });
      this.userCollection = await this.chromaClient.getOrCreateCollection({
        name: 'users',
        embeddingFunction: this.embeddingFunction,
      });
      this.chatHistoryCollection =
        await this.chromaClient.getOrCreateCollection({
          name: 'chat_history',
          embeddingFunction: this.embeddingFunction,
        });
      this.quizCollection = await this.chromaClient.getOrCreateCollection({
        name: 'quizzes',
        embeddingFunction: this.embeddingFunction,
      });
      this.logger.log('ChromaDB collections initialized');
    } catch (error) {
      this.logger.error(
        'Failed to initialize ChromaDB collections',
        error.stack,
        error.message,
      );
      throw new Error('ChromaDB initialization failed');
    }
  }

  private async generateCvId(): Promise<string> {
    try {
      const result = await this.cvCollection.get();
      const mainCvCount = result.ids.filter(
        (id) => !id.includes('_chunk_'),
      ).length;
      const newId = `cv${mainCvCount + 1}`;
      this.logger.debug(
        `Generating CV ID: ${newId} (main CVs: ${mainCvCount}, total records: ${result.ids.length})`,
      );
      return newId;
    } catch (error) {
      this.logger.error('Failed to generate CV ID', error.stack, error.message);
      throw new Error('CV ID generation failed');
    }
  }

  private async resolveFileNameToCvId(fileName: string): Promise<string> {
    try {
      this.logger.debug(`Attempting to resolve fileName: ${fileName}`);

      // First try: get all documents and find the main CV
      const allCvs = await this.cvCollection.get();

      // Find the main CV (non-chunk) document that matches the fileName
      for (let i = 0; i < allCvs.ids.length; i++) {
        if (allCvs.ids[i].includes('_chunk_')) continue;

        try {
          const doc = JSON.parse(allCvs.documents[i]!);
          if (doc.fileName === fileName) {
            return allCvs.ids[i];
          }
        } catch (e) {
          continue;
        }
      }

      // If no main CV found, try to extract cvId from chunks
      const chunks = allCvs.documents
        .map((doc, index) => ({
          id: allCvs.ids[index],
          doc: doc,
        }))
        .filter((item) => item.id.includes('_chunk_'));

      for (const chunk of chunks) {
        try {
          const parsedChunk = JSON.parse(chunk.doc!);
          if (parsedChunk.fileName === fileName) {
            // Extract the base cvId from the chunk id (e.g., "cv1_chunk_0" -> "cv1")
            const cvId = chunk.id.split('_chunk_')[0];
            this.logger.debug(`Found matching chunk, extracted cvId: ${cvId}`);
            return cvId;
          }
        } catch (e) {
          continue;
        }
      }

      this.logger.warn(`No CV found for fileName: ${fileName}`);
      throw new NotFoundException(`CV not found for fileName: ${fileName}`);
    } catch (error) {
      this.logger.error(
        `Failed to resolve fileName ${fileName}`,
        error.stack,
        error.message,
      );
      throw error;
    }
  }

  async uploadCv(
    uploaderEmail: string,
    file: Express.Multer.File,
    name: string,
  ): Promise<{ cvId: string }> {
    try {
      const absoluteUploadFolder = path.resolve(this.uploadFolder);
      this.logger.log(`Upload folder path: ${absoluteUploadFolder}`);

      if (!fs.existsSync(this.uploadFolder)) {
        fs.mkdirSync(this.uploadFolder, { recursive: true });
        this.logger.log(`Created upload folder: ${absoluteUploadFolder}`);
      }

      // Check for duplicate CV by provided name
      const nameLower = name.toLowerCase();
      const existingCvs = await this.cvCollection.get({
        where: { uploadedBy: uploaderEmail },
      });
      this.logger.log(
        `Existing CVs: ${JSON.stringify(
          existingCvs.documents.map((doc: string) => JSON.parse(doc)),
        )}`,
      );
      const duplicateCv = existingCvs.documents.find(
        (doc: string) => JSON.parse(doc).name?.toLowerCase() === nameLower,
      );
      if (duplicateCv) {
        this.logger.warn(
          `Duplicate CV detected for ${uploaderEmail}, name: ${name}`,
        );
        throw new BadRequestException('CV with this name already exists');
      }

      // Generate hashed filename
      const hash = crypto
        .createHash('sha256')
        .update(file.originalname + Date.now().toString())
        .digest('hex');
      const cvId = await this.generateCvId();
      const fileName = `${hash}.pdf`;
      const filePath = path.join(this.uploadFolder, fileName);
      this.logger.log(`Saving CV to: ${path.resolve(filePath)}`);

      fs.writeFileSync(filePath, file.buffer);
      this.logger.log(`CV file saved to: ${filePath}`);

      // Store original CV metadata
      const cvDocument = JSON.stringify({
        uploadDate: new Date().toISOString(),
        name: name,
        fileName: fileName,
      });

      await this.cvCollection.add({
        ids: [cvId],
        documents: [cvDocument],
        metadatas: [{ uploadedBy: uploaderEmail }],
      });
      this.logger.log(`Stored CV metadata for ${cvId}`);

      // Convert PDF to text and store chunks
      const text = await this.extractTextFromPdf(filePath);
      this.logger.log(`Extracted text length: ${text.length} characters`);

      // Split text into chunks
      const chunks = this.splitTextIntoChunks(text, 500);
      this.logger.log(`Split text into ${chunks.length} chunks`);

      // Generate embeddings for chunks
      const embeddings = await this.embeddingFunction.generate(chunks);
      this.logger.log(`Generated ${embeddings.length} embeddings`);

      // Prepare chunk documents and metadata
      const chunkDocuments = chunks.map((chunk, index) =>
        JSON.stringify({
          chunkIndex: index,
          text: chunk,
          cvId,
          uploadDate: new Date().toISOString(),
          name: name,
          fileName,
        }),
      );

      const chunkMetadatas = chunks.map((_, index) => ({
        cvId,
        uploadedBy: uploaderEmail,
        chunkIndex: index,
        fileName,
      }));

      const chunkIds = chunks.map((_, index) => `${cvId}_chunk_${index}`);

      // Store chunks in ChromaDB
      await this.cvCollection.add({
        ids: chunkIds,
        documents: chunkDocuments,
        metadatas: chunkMetadatas,
        embeddings,
      });
      this.logger.log(
        `Stored ${chunks.length} chunks for CV ${cvId} in ChromaDB`,
      );

      return { cvId };
    } catch (error) {
      this.logger.error('CV upload failed', error.stack, error.message);
      throw error;
    }
  }

  private async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdf = await pdfParse(dataBuffer);
      return pdf.text;
    } catch (error) {
      this.logger.error(
        `Failed to extract text from ${filePath}`,
        error.stack,
        error.message,
      );
      throw new Error('PDF text extraction failed');
    }
  }

  private splitTextIntoChunks(text: string, maxTokens: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;

    for (const word of words) {
      const tokenEstimate = Math.ceil(word.length / 4);
      if (currentTokenCount + tokenEstimate > maxTokens) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
        currentTokenCount = tokenEstimate;
      } else {
        currentChunk.push(word);
        currentTokenCount += tokenEstimate;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks.filter((chunk) => chunk.trim().length > 0);
  }

  async getCv(
    fileName: string,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ filePath: string; fileName: string }> {
    try {
      this.logger.log(
        `Retrieving CV for fileName ${fileName} by ${requesterEmail}`,
      );
      const cvId = await this.resolveFileNameToCvId(fileName);
      const result = await this.cvCollection.get({ ids: [cvId] });
      this.logger.debug(`CV query result: ${JSON.stringify(result)}`);
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      const cvDoc = JSON.parse(result.documents[0]);
      if (
        requesterRole !== 'admin' &&
        result.metadatas[0]?.uploadedBy !== requesterEmail
      ) {
        this.logger.warn(
          `Unauthorized access attempt by ${requesterEmail} for CV ${cvId}`,
        );
        throw new ForbiddenException('You are not authorized to view this CV');
      }

      const resolvedFileName = cvDoc.fileName || `${cvId}_cv.pdf`;
      const filePath = path.join(this.uploadFolder, resolvedFileName);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`CV file not found at: ${filePath}`);
        throw new NotFoundException('CV file not found');
      }

      this.logger.log(`CV ${cvId} retrieved successfully at: ${filePath}`);
      return { filePath, fileName: resolvedFileName };
    } catch (error) {
      this.logger.error('CV retrieval failed', error.stack, error.message);
      throw error;
    }
  }

  async deleteCv(cvId: string): Promise<void> {
    try {
      this.logger.log(`Deleting CV ${cvId}`);
      const result = await this.cvCollection.get({ ids: [cvId] });
      this.logger.debug(`CV query result: ${JSON.stringify(result)}`);
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      const cvDoc = JSON.parse(result.documents[0]);
      const fileName = cvDoc.fileName || `${cvId}_cv.pdf`;
      const filePath = path.join(this.uploadFolder, fileName);
      this.logger.debug(`Checking file at: ${filePath}`);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted CV file: ${filePath}`);
      } else {
        this.logger.warn(`CV file not found at: ${filePath}`);
      }

      await this.cvCollection.delete({ ids: [cvId] });
      this.logger.log(`${cvId} deleted from collection`);

      const chunkResult = await this.cvCollection.get({ where: { cvId } });
      if (chunkResult.ids.length > 0) {
        await this.cvCollection.delete({ ids: chunkResult.ids });
        this.logger.log(
          `Deleted ${chunkResult.ids.length} chunks for CV ${cvId}`,
        );
      } else {
        this.logger.debug(`No chunks found for CV ${cvId}`);
      }

      const chatResult = await this.chatHistoryCollection.get({
        where: { cvId },
      });
      if (chatResult.ids.length > 0) {
        await this.chatHistoryCollection.delete({ ids: chatResult.ids });
        this.logger.log(
          `Deleted ${chatResult.ids.length} chat entries for CV ${cvId}`,
        );
      } else {
        this.logger.debug(`No chat history found for CV ${cvId}`);
      }

      const quizResult = await this.quizCollection.get({ where: { cvId } });
      if (quizResult.ids.length > 0) {
        await this.quizCollection.delete({ ids: quizResult.ids });
        this.logger.log(
          `Deleted ${quizResult.ids.length} quiz entries for CV ${cvId}`,
        );
      } else {
        this.logger.debug(`No quizzes found for CV ${cvId}`);
      }
    } catch (error) {
      this.logger.error(
        `CV deletion failed for ${cvId}`,
        error.stack,
        error.message,
      );
      throw error;
    }
  }

  async listCvs(requesterRole: string, requesterEmail: string): Promise<any[]> {
    try {
      const result = await this.cvCollection.get();
      this.logger.log(`Retrieved ${result.ids.length} CVs`);

      if (result.ids.length === 0) {
        this.logger.warn(`No CVs found in cvCollection for ${requesterEmail}`);
        return [];
      }
      let mainCvCounter = 0;
      const mainCvs = result.documents
        .map((doc, index) => {
          if (result.ids[index].includes('_chunk_')) return null;
          const parsedDoc = JSON.parse(doc!);
          const fileName = parsedDoc.fileName || `${result.ids[index]}_cv.pdf`;
          const filePath = path.join(this.uploadFolder, fileName);
          return {
            realId: result.ids[index],
            indexId: ++mainCvCounter,
            name: parsedDoc.name || 'CV',
            email: result.metadatas[index]!.uploadedBy,
            uploadDate: parsedDoc.uploadDate,
            uploadedBy: result.metadatas[index]!.uploadedBy,
            filePath: fs.existsSync(filePath) ? filePath : null,
            fileName,
            downloadUrl: `/cv/${fileName}`,
          };
        })
        .filter((cv) => cv !== null);

      this.logger.log(`Filtered ${mainCvs.length} main CVs`);

      if (requesterRole === 'admin') {
        const quizzes = await this.quizCollection.get();

        const enrichedCvs = mainCvs.map((cv) => {
          const quiz = quizzes.documents

            .map((doc) => JSON.parse(doc!))

            .find((q) => q.cvId === cv.realId);

          return {
            ...cv,

            quizStatus: quiz
              ? quiz.completedAt
                ? 'completed'
                : 'generated'
              : 'not_generated',
          };
        });
        return enrichedCvs;
      } else {
        const userCvs = mainCvs.filter((cv) => {
          this.logger.debug(
            `Comparing cv.uploadedBy: ${cv.uploadedBy} with requesterEmail: ${requesterEmail}`,
          );
          return cv.uploadedBy === requesterEmail;
        });
        this.logger.debug(`Filtered User CVs: ${JSON.stringify(userCvs)}`);
        const quizzes = await this.quizCollection.get();
        const enrichedCvs = userCvs.map((cv) => {
          const quiz = quizzes.documents
            .map((doc) => JSON.parse(doc!))
            .find((q) => q.cvId === cv.realId);
          return {
            ...cv,
            quizStatus: quiz
              ? quiz.completedAt
                ? 'completed'
                : 'generated'
              : 'not_generated',
          };
        });
        return enrichedCvs;
      }
    } catch (error) {
      this.logger.error('List CVs failed', error.stack, error.message);
      throw error;
    }
  }

  async chatCv(
    fileName: string,
    chatCvDto: ChatCvDto,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ response: string }> {
    try {
      const cvId = await this.resolveFileNameToCvId(fileName);
      this.logger.log(
        `Chat request for CV ${cvId} (fileName: ${fileName}) by ${requesterEmail} with role ${requesterRole}`,
      );

      const result = await this.cvCollection.get({ where: { cvId } });
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }
      this.logger.debug(`Retrieved ${result.ids.length} chunks for CV ${cvId}`);

      const { message } = chatCvDto;
      this.logger.log(`Received message: ${message}`);

      const queryEmbedding = (
        await this.embeddingFunction.generate([message])
      )[0];
      this.logger.log(`Generated query embedding for: ${message}`);

      const queryResult = await this.cvCollection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 5,
        where: { cvId },
      });
      this.logger.debug(`Query result: ${JSON.stringify(queryResult)}`);

      const context = queryResult.documents[0]
        .map((doc, index) => {
          const parsedDoc = JSON.parse(doc!);
          return `Chunk ${parsedDoc.chunkIndex}:\n${parsedDoc.text}`;
        })
        .join('\n\n');
      this.logger.log(`Formatted context length: ${context.length} characters`);

      if (!context) {
        this.logger.warn(`No relevant chunks found for CV ${cvId}`);
        return { response: 'No relevant information found in the CV.' };
      }

      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!openaiApiKey) {
        this.logger.error('OPENAI_API_KEY is not defined in .env');
        throw new Error('OPENAI_API_KEY is required');
      }

      const llm = new ChatOpenAI({
        openAIApiKey: openaiApiKey,
        modelName: 'gpt-4o-mini',
        temperature: 0.7,
      });

      const promptTemplate = PromptTemplate.fromTemplate(`
        You are an AI assistant answering questions about a candidate's CV. Use the following CV content to provide an accurate and concise response. If the information is not available, state so clearly.
  
        CV Content:
        {context}
  
        User Question: {question}
  
        Response:
      `);

      const chain = RunnableSequence.from([
        {
          context: () => context,
          question: new RunnablePassthrough(),
        },
        promptTemplate,
        llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke(message);
      this.logger.log(`Chat response: ${response}`);

      const chatId = `chat_${cvId}_${Date.now()}`;
      const chatDocument = JSON.stringify({
        cvId,
        userEmail: requesterEmail,
        query: message,
        response,
        timestamp: new Date().toISOString(),
      });
      const chatEmbedding = queryEmbedding;
      await this.chatHistoryCollection.add({
        ids: [chatId],
        documents: [chatDocument],
        metadatas: [{ cvId, userEmail: requesterEmail }],
        embeddings: [chatEmbedding],
      });
      this.logger.log(`Stored chat entry ${chatId} for CV ${cvId}`);

      return { response };
    } catch (error) {
      this.logger.error('Chat CV failed', error.stack, error.message);
      throw error;
    }
  }

  async getChatHistory(
    fileName: string,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ query: string; response: string; timestamp: string }[]> {
    try {
      this.logger.log(
        `Retrieving chat history for fileName ${fileName} by ${requesterEmail} with role ${requesterRole}`,
      );

      const cvId = await this.resolveFileNameToCvId(fileName);
      this.logger.debug(`Resolved fileName ${fileName} to cvId ${cvId}`);

      const cvResult = await this.cvCollection.get({ ids: [cvId] });
      this.logger.debug(`CV query result: ${JSON.stringify(cvResult)}`);
      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      if (
        requesterRole !== 'admin' &&
        cvResult.metadatas[0]?.uploadedBy !== requesterEmail
      ) {
        this.logger.warn(
          `Unauthorized chat history access by ${requesterEmail} for CV ${cvId}`,
        );
        throw new ForbiddenException(
          'You are not authorized to view this chat history',
        );
      }

      const whereClause: Where = {
        $and: [{ cvId: cvId } as Where, { userEmail: requesterEmail } as Where],
      };
      this.logger.debug(
        `Querying chat_history with where: ${JSON.stringify(whereClause)}`,
      );

      try {
        const chatResult = await this.chatHistoryCollection.get({
          where: whereClause,
        });
        this.logger.debug(
          `Chat history query result: ${JSON.stringify(chatResult)}`,
        );

        if (!chatResult.documents || chatResult.documents.length === 0) {
          this.logger.debug('No chat history found');
          return [];
        }

        const chatHistory = chatResult.documents
          .map((doc) => {
            try {
              const parsedDoc = JSON.parse(doc!);
              return {
                query: parsedDoc.query,
                response: parsedDoc.response,
                timestamp: parsedDoc.timestamp,
              };
            } catch (parseError) {
              this.logger.error(
                `Failed to parse chat document: ${doc}`,
                parseError.stack,
              );
              return null;
            }
          })
          .filter(
            (
              entry,
            ): entry is {
              query: string;
              response: string;
              timestamp: string;
            } => entry !== null,
          )
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );

        this.logger.log(
          `Retrieved ${chatHistory.length} chat entries for CV ${cvId} by ${requesterEmail}`,
        );

        return chatHistory;
      } catch (chatQueryError) {
        this.logger.error(
          `Failed to query chat history collection: ${chatQueryError.message}`,
          chatQueryError.stack,
        );
        throw new Error(
          `Failed to query chat history: ${chatQueryError.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Chat history retrieval failed for fileName ${fileName}`,
        error.stack,
        error.message,
      );
      throw error;
    }
  }

  // quize functions
  async getCvSkills(
    fileName: string,
  ): Promise<{ skills: string[]; level: string }> {
    try {
      this.logger.log(`Extracting skills for fileName: ${fileName}`);

      const cvId = await this.resolveFileNameToCvId(fileName);

      const result = await this.cvCollection.get({ where: { cvId } });

      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      const chunks = result.documents
        .map((doc) => JSON.parse(doc!))
        .filter((doc) => doc.text)
        .map((doc) => doc.text)
        .join('\n');

      if (!chunks) {
        this.logger.warn(`No text chunks found for CV ${cvId}`);
        throw new NotFoundException('No text found in CV');
      }

      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!openaiApiKey) {
        this.logger.error('OPENAI_API_KEY is not defined in .env');
        throw new Error('OPENAI_API_KEY is required');
      }

      const llm = new ChatOpenAI({
        openAIApiKey: openaiApiKey,
        modelName: 'gpt-4o-mini',
        temperature: 0.5,
      });

      const promptTemplate = PromptTemplate.fromTemplate(`
        You are an AI assistant tasked with extracting technical skills and estimating the candidate's proficiency level from a CV. The CV text is provided below. Identify all technical skills (e.g., programming languages, frameworks, tools) mentioned explicitly or implied through experience. Estimate the overall proficiency level as "beginner", "intermediate", or "advanced" based on years of experience, project complexity, or certifications mentioned. If no clear level is indicated, default to "intermediate".

        CV Text:
        {cvText}

        Output in JSON format:
        {
          "skills": ["skill1", "skill2", ...],
          "level": "beginner|intermediate|advanced"
        }
      `);

      const chain = RunnableSequence.from([
        { cvText: new RunnablePassthrough() },
        promptTemplate,
        llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke(chunks);

      let parsedResponse: { skills: string[]; level: string };
      try {
        parsedResponse = JSON.parse(response);
      } catch (e) {
        this.logger.error(`Failed to parse skills response: ${response}`, e);
        throw new Error('Failed to parse skills response');
      }

      this.logger.log(`Extracted skills: ${JSON.stringify(parsedResponse)}`);
      return parsedResponse;
    } catch (error) {
      this.logger.error('Skill extraction failed', error.stack, error.message);
      throw error;
    }
  }

  async generateQuiz(
    fileName: string,

    requesterEmail: string,

    requesterRole: string,
  ): Promise<{
    quizId: string;

    link: string;

    questions: {
      id: string;
      text: string;
      options: string[];
      correct: number;
    }[];
  }> {
    try {
      this.logger.log(`Generating quiz for fileName: ${fileName}`);

      const cvId = await this.resolveFileNameToCvId(fileName);

      const cvResult = await this.cvCollection.get({ ids: [cvId] });

      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);

        throw new NotFoundException('CV not found');
      }

      if (
        requesterRole !== 'admin' &&
        cvResult.metadatas[0]?.uploadedBy !== requesterEmail
      ) {
        this.logger.warn(
          `Unauthorized quiz generation attempt by ${requesterEmail} for CV ${cvId}`,
        );

        throw new ForbiddenException(
          'You are not authorized to generate a quiz for this CV',
        );
      }

      const skillsResult = await this.getCvSkills(fileName);

      const { skills, level } = skillsResult;

      if (!skills || skills.length === 0) {
        this.logger.warn(`No skills found for CV ${cvId}`);

        throw new BadRequestException('No skills found to generate a quiz');
      }

      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');

      if (!openaiApiKey) {
        this.logger.error('OPENAI_API_KEY is not defined in .env');

        throw new Error('OPENAI_API_KEY is required');
      }

      const llm = new ChatOpenAI({
        openAIApiKey: openaiApiKey,

        modelName: 'gpt-4o-mini',

        temperature: 0.7,
      });

      const promptTemplate = PromptTemplate.fromTemplate(`

        You are an AI assistant tasked with generating a technical quiz based on a candidate's skills and proficiency level. The skills are: {skills}. The proficiency level is: {level}. Generate a quiz with 5 multiple-choice questions, each with 4 options and one correct answer. The questions should be appropriate for the given proficiency level (beginner, intermediate, or advanced).



        Output in JSON format:

        {

          "questions": [

            {

              "id": "q1",

              "text": "Question text",

              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],

              "correct": 0

            },

            ...

          ]

        }

      `);

      const chain = RunnableSequence.from([
        {
          skills: () => skills.join(', '),

          level: () => level,
        },

        promptTemplate,

        llm,

        new StringOutputParser(),
      ]);

      const response = await chain.invoke({});

      let parsedResponse: {
        questions: {
          id: string;
          text: string;
          options: string[];
          correct: number;
        }[];
      };

      try {
        parsedResponse = JSON.parse(response);
      } catch (e) {
        this.logger.error(`Failed to parse quiz response: ${response}`, e);

        throw new Error('Failed to parse quiz response');
      }

      const quizId = uuidv4();

      const appUrl =
        this.configService.get<string>('NEXT_PUBLIC_APP_URL') ||
        'http://localhost:3000';

      const quizLink = `${appUrl}/quiz/${quizId}`;

      const quizDocument = JSON.stringify({
        quizId,

        cvId,

        fileName,

        questions: parsedResponse.questions,

        createdAt: new Date().toISOString(),

        createdBy: requesterEmail,
      });

      await this.quizCollection.add({
        ids: [quizId],

        documents: [quizDocument],

        metadatas: [{ cvId, fileName, createdBy: requesterEmail }],
      });

      this.logger.log(`Stored quiz ${quizId} for CV ${cvId}`);

      return {
        quizId,

        link: quizLink,

        questions: parsedResponse.questions,
      };
    } catch (error) {
      this.logger.error('Quiz generation failed', error.stack, error.message);

      throw error;
    }
  }

  async getQuiz(quizId: string): Promise<{
    quizId: string;
    cvId: string;
    fileName: string;
    questions: {
      id: string;
      text: string;
      options: string[];
      correct: number;
    }[];
    completedAt?: string;
  }> {
    try {
      this.logger.log(`Retrieving quiz for quizId: ${quizId}`);
      const result = await this.quizCollection.get({ ids: [quizId] });
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`Quiz ${quizId} not found`);
        throw new NotFoundException('Quiz not found');
      }
      const quizDoc = JSON.parse(result.documents[0]);
      return {
        quizId: quizDoc.quizId,
        cvId: quizDoc.cvId,
        fileName: quizDoc.fileName,
        questions: quizDoc.questions,
        completedAt: quizDoc.completedAt,
      };
    } catch (error) {
      this.logger.error(
        'Quiz retrieval failed',
        error.stack,
        error.message,
      );
      throw error;
    }
  }

  async getQuizResults(
    quizId: string,

    requesterEmail: string,

    requesterRole: string,
  ): Promise<{
    fileName: string;

    score: number;

    timeTaken: number;

    completedAt: string;
  }> {
    try {
      this.logger.log(`Retrieving quiz results for quizId: ${quizId}`);

      const result = await this.quizCollection.get({ ids: [quizId] });

      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`Quiz ${quizId} not found`);

        throw new NotFoundException('Quiz not found');
      }

      const quizDoc = JSON.parse(result.documents[0]);

      const cvId = quizDoc.cvId;

      const cvResult = await this.cvCollection.get({ ids: [cvId] });

      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);

        throw new NotFoundException('CV not found');
      }

      if (
        requesterRole !== 'admin' &&
        cvResult.metadatas[0]?.uploadedBy !== requesterEmail
      ) {
        this.logger.warn(
          `Unauthorized quiz results access by ${requesterEmail} for quiz ${quizId}`,
        );

        throw new ForbiddenException(
          'You are not authorized to view this quiz result',
        );
      }

      if (!quizDoc.completedAt) {
        this.logger.warn(`Quiz ${quizId} has not been completed`);

        throw new BadRequestException('Quiz has not been completed');
      }

      return {
        fileName: quizDoc.fileName,

        score: quizDoc.score || 0,

        timeTaken: quizDoc.timeTaken || 0,

        completedAt: quizDoc.completedAt,
      };
    } catch (error) {
      this.logger.error(
        'Quiz results retrieval failed',
        error.stack,
        error.message,
      );

      throw error;
    }
  }

  async submitQuizAnswers(
    quizId: string,

    answers: { [questionId: string]: number },

    timeTaken: number,
  ): Promise<void> {
    try {
      this.logger.log(`Submitting answers for quizId: ${quizId}`);

      const result = await this.quizCollection.get({ ids: [quizId] });

      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`Quiz ${quizId} not found`);

        throw new NotFoundException('Quiz not found');
      }

      const quizDoc = JSON.parse(result.documents[0]);

      if (quizDoc.completedAt) {
        this.logger.warn(`Quiz ${quizId} already completed`);

        throw new BadRequestException('Quiz already completed');
      }

      const questions = quizDoc.questions;

      let correctAnswers = 0;

      for (const question of questions) {
        const userAnswer = answers[question.id];

        if (userAnswer === question.correct) {
          correctAnswers++;
        }
      }

      const score = (correctAnswers / questions.length) * 100;

      quizDoc.score = score;

      quizDoc.timeTaken = timeTaken;

      quizDoc.completedAt = new Date().toISOString();

      await this.quizCollection.upsert({
        ids: [quizId],

        documents: [JSON.stringify(quizDoc)],

        metadatas: [result.metadatas[0]!],
      });

      this.logger.log(`Quiz ${quizId} answers submitted: score=${score}%`);
    } catch (error) {
      this.logger.error(
        'Quiz answer submission failed',
        error.stack,
        error.message,
      );

      throw error;
    }
  }

  async sendQuizEmail(
    email: string,

    quizLink: string,

    requesterEmail: string,

    requesterRole: string,
  ): Promise<void> {
    try {
      this.logger.log(`Sending quiz email to ${email} from ${requesterEmail}`);

      const quizId = quizLink.split('/').pop();

      if (!quizId) {
        this.logger.warn('Invalid quiz link');

        throw new BadRequestException('Invalid quiz link');
      }

      const result = await this.quizCollection.get({ ids: [quizId] });

      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`Quiz ${quizId} not found`);

        throw new NotFoundException('Quiz not found');
      }

      const quizDoc = JSON.parse(result.documents[0]);

      const cvId = quizDoc.cvId;

      const cvResult = await this.cvCollection.get({ ids: [cvId] });

      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);

        throw new NotFoundException('CV not found');
      }

      if (
        requesterRole !== 'admin' &&
        cvResult.metadatas[0]?.uploadedBy !== requesterEmail
      ) {
        this.logger.warn(
          `Unauthorized email send attempt by ${requesterEmail} for quiz ${quizId}`,
        );

        throw new ForbiddenException(
          'You are not authorized to send this quiz',
        );
      }

      const msg = {
        to: email,

        from:
          this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
          'no-reply@yourapp.com',

        subject: 'Your Technical Quiz',

        text: `Please take your technical quiz here: ${quizLink}`,

        html: `

          <h2>Technical Quiz</h2>

          <p>Please click the link below to start your quiz:</p>

          <a href="${quizLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">

            Start Quiz

          </a>

        `,
      };

      await sgMail.send(msg);

      this.logger.log(`Quiz email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        'Quiz email sending failed',
        error.stack,
        error.message,
      );

      throw error;
    }
  }
}
