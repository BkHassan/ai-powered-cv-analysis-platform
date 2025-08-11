import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChromaClient, Collection } from 'chromadb';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import * as sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
import { CvService } from '../cv/cv.service';
import * as crypto from 'crypto';

@Injectable()
export class QuizService {
  private quizCollection: Collection;
  private quizAttemptsCollection: Collection;
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly chromaClient: ChromaClient,
    private readonly configService: ConfigService,
    private readonly cvService: CvService,
  ) {
    this.chromaClient = new ChromaClient({
      path:
        this.configService.get<string>('CHROMADB_URL') ||
        'http://chromadb:8000',
    });
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
      this.quizCollection = await this.chromaClient.getOrCreateCollection({
        name: 'quizzes',
        embeddingFunction: this.cvService['embeddingFunction'],
      });
      this.quizAttemptsCollection =
        await this.chromaClient.getOrCreateCollection({
          name: 'quiz_attempts',
          embeddingFunction: this.cvService['embeddingFunction'],
        });
      this.logger.log('Quiz and Quiz Attempts ChromaDB collection initialized');
    } catch (error) {
      this.logger.error(
        'Failed to initialize quiz ChromaDB collection',
        error.stack,
        error.message,
      );
      throw new Error('Quiz ChromaDB initialization failed');
    }
  }

  async getCvSkills(
    fileName: string,
  ): Promise<{ skills: string[]; level: string }> {
    try {
      this.logger.log(`Extracting skills for fileName: ${fileName}`);

      const cvId = await this.cvService.resolveFileNameToCvId(fileName);

      const result = await this.cvService['cvCollection'].get({
        where: { cvId },
      });

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

      this.logger.debug(`Joined CV text: ${chunks.substring(0, 500)}...`);

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
        You are an AI assistant tasked with extracting technical skills and estimating the candidate's proficiency level from a CV. The CV text is provided below and may be in any language (e.g., English, Arabic). Identify all technical skills (e.g., programming languages, frameworks, tools, design software) mentioned explicitly or implied through experience. Estimate the overall proficiency level as "beginner", "intermediate", or "advanced" based on years of experience, project complexity, or certifications mentioned. If no clear level is indicated, default to "intermediate".

        CV Text:
        {cvText}

        Provide the output as a JSON object, without wrapping it in markdown code blocks (e.g., \`\`\`json). Example format:
        {{
          "skills": ["skill1", "skill2"],
          "level": "beginner|intermediate|advanced"
        }}
      `);

      const chain = RunnableSequence.from([
        { cvText: new RunnablePassthrough() },
        promptTemplate,
        llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke(chunks);

      // Strip markdown code blocks if present
      const cleanedResponse = response
        .replace(/```json\n/, '')
        .replace(/\n```/, '')
        .trim();

      let parsedResponse: { skills: string[]; level: string };
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (e) {
        this.logger.error(
          `Failed to parse skills response: ${cleanedResponse}`,
          e,
        );
        throw new Error('Failed to parse skills response');
      }

      this.logger.log(`Extracted skills: ${JSON.stringify(parsedResponse)}`);
      return parsedResponse;
    } catch (error) {
      this.logger.error('Skill extraction failed', error.stack, error.message);
      throw error;
    }
  }

  async getCvEmail(fileName: string): Promise<string> {
    try {
      this.logger.log(`Extracting email for fileName: ${fileName}`);

      const cvId = await this.cvService.resolveFileNameToCvId(fileName);

      const result = await this.cvService['cvCollection'].get({
        where: { cvId },
      });

      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      // Check metadata first
      const metadataEmail = result.metadatas[0]?.candidateEmail;
      if (metadataEmail) {
        this.logger.log(`Email found in metadata: ${metadataEmail}`);
        return metadataEmail as string;
      }

      const chunks = result.documents
        .map((doc) => JSON.parse(doc || '{}').text || '')
        .filter((text) => text)
        .join('\n');

      if (!chunks) {
        this.logger.warn(`No text chunks found for CV ${cvId}`);
        throw new NotFoundException('No text found in CV');
      }

      this.logger.debug(`Joined CV text: ${chunks.substring(0, 500)}...`);

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
        You are an AI assistant tasked with extracting the candidate's email address from a CV. The CV text is provided below and may be in any language or format. Identify the email address explicitly mentioned (e.g., "hello@reallygreatsite.com") or implied (e.g., "contact: hello at reallygreatsite dot com"). Return the email as a string in standard format (e.g., "user@domain.com"). If no email is found, return an empty string.

        CV Text:
        {cvText}

        Provide the output as a plain string, not wrapped in JSON or markdown.
      `);

      const chain = RunnableSequence.from([
        { cvText: new RunnablePassthrough() },
        promptTemplate,
        llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke(chunks);

      // Trim and validate the response
      const extractedEmail = response.trim();
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      if (extractedEmail && !emailRegex.test(extractedEmail)) {
        this.logger.warn(`Invalid email format extracted: ${extractedEmail}`);
        return '';
      }

      this.logger.log(`Extracted email: ${extractedEmail || 'none'}`);
      return extractedEmail;
    } catch (error) {
      this.logger.error('Email extraction failed', error.stack, error.message);
      throw error;
    }
  }

  async generateQuiz(
    fileName: string,
    requesterEmail: string,
    requesterRole: string,
    candidateEmail?: string,
    questionCount: number = 5,
    timeLimit?: number,
  ): Promise<{
    quizId: string;
    link: string;
    candidateEmail: string;
    questions: {
      id: string;
      text: string;
      options: string[];
      correct: number;
    }[];
  }> {
    try {
      this.logger.log(
        `Generating quiz for fileName: ${fileName} with ${questionCount} questions`,
      );

      const cvId = await this.cvService.resolveFileNameToCvId(fileName);

      const cvResult = await this.cvService['cvCollection'].get({
        where: { cvId },
      });

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

      let extractedEmail = candidateEmail;
      if (!extractedEmail) {
        extractedEmail = await this.getCvEmail(fileName);
        if (!extractedEmail) {
          this.logger.warn(`No email found in CV text for ${cvId}`);
          throw new BadRequestException('No email found in CV');
        }
        this.logger.log(`Extracted email: ${extractedEmail}`);
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
        You are an AI assistant tasked with generating a technical quiz based on a candidate's skills and proficiency level. The skills are: {skills}. The proficiency level is: {level}. Generate a quiz with {questionCount} multiple-choice questions, each with 4 options and one correct answer. The questions should be appropriate for the given proficiency level (beginner, intermediate, or advanced).

        Provide the output as a JSON object, without wrapping it in markdown code blocks (e.g., \`\`\`json). Example format:
        {{
          "questions": [
            {{
              "id": "q1",
              "text": "Question text",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
              "correct": 0
            }}
          ]
        }}
      `);

      const chain = RunnableSequence.from([
        {
          skills: () => skills.join(', '),
          level: () => level,
          questionCount: () => questionCount.toString(),
        },
        promptTemplate,
        llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({});
      const cleanedResponse = response
        .replace(/```json\n/, '')
        .replace(/\n```/, '')
        .trim();

      let parsedResponse: {
        questions: {
          id: string;
          text: string;
          options: string[];
          correct: number;
        }[];
      };
      try {
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (e) {
        this.logger.error(
          `Failed to parse quiz response: ${cleanedResponse}`,
          e,
        );
        throw new Error('Failed to parse quiz response');
      }

      if (parsedResponse.questions.length !== questionCount) {
        this.logger.warn(
          `Expected ${questionCount} questions, but received ${parsedResponse.questions.length}`,
        );
        throw new BadRequestException(
          `Generated quiz does not contain the requested number of questions (${questionCount})`,
        );
      }

      // Validate inputs for ChromaDB query
      if (!cvId || !fileName) {
        this.logger.error(`Invalid cvId: ${cvId} or fileName: ${fileName}`);
        throw new BadRequestException('Invalid CV ID or file name');
      }

      const quizId = uuidv4();

      const secureToken = crypto.randomBytes(16).toString('hex');
      const appUrl =
        this.configService.get<string>('NEXT_PUBLIC_APP_URL') ||
        'http://localhost:3000';
      const quizLink = `${appUrl}/quiz/${quizId}?token=${secureToken}`;

      // Get attempt number
      const attempts = await this.quizAttemptsCollection.get({
        where: {
          $and: [{ cvId: cvId }, { fileName: fileName }],
        },
      });
      const attemptNumber = attempts.ids.length + 1;

      const quizDocument = JSON.stringify({
        quizId,
        cvId,
        fileName,
        questions: parsedResponse.questions,
        secureToken,
        createdAt: new Date().toISOString(),
        createdBy: requesterEmail,
        candidateEmail: extractedEmail,
        attemptNumber,
        timeLimit: timeLimit || questionCount * 45, // Default to 60s per question
      });

      await this.quizCollection.add({
        ids: [quizId],
        documents: [quizDocument],
        metadatas: [
          {
            cvId,
            fileName,
            createdBy: requesterEmail,
            candidateEmail: extractedEmail,
            attemptNumber,
          },
        ],
      });

      this.logger.log(
        `Stored quiz ${quizId} for CV ${cvId}, attempt ${attemptNumber}`,
      );

      return {
        quizId,
        link: quizLink,
        candidateEmail: extractedEmail,
        questions: parsedResponse.questions,
      };
    } catch (error) {
      this.logger.error('Quiz generation failed', error.stack, error.message);
      throw error;
    }
  }

  async getQuiz(
    quizId: string,
    token: string,
  ): Promise<{
    quizId: string;
    cvId: string;
    fileName: string;
    candidateEmail: string;
    questions: {
      id: string;
      text: string;
      options: string[];
      correct: number;
    }[];
    completedAt?: string;
    timeLimit?: number;
  }> {
    try {
      this.logger.log(`Retrieving quiz for quizId: ${quizId}`);
      const result = await this.quizCollection.get({ ids: [quizId] });
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`Quiz ${quizId} not found`);
        throw new NotFoundException('Quiz not found');
      }
      const quizDoc = JSON.parse(result.documents[0]);
      if (quizDoc.secureToken !== token) {
        this.logger.warn(`Invalid token for quiz ${quizId}`);
        throw new ForbiddenException('Invalid quiz token');
      }
      return {
        quizId: quizDoc.quizId,
        cvId: quizDoc.cvId,
        fileName: quizDoc.fileName,
        questions: quizDoc.questions,
        completedAt: quizDoc.completedAt || undefined,
        candidateEmail: quizDoc.candidateEmail || '',
        timeLimit: quizDoc.timeLimit,
      };
    } catch (error) {
      this.logger.error('Quiz retrieval failed', error.stack, error.message);
      throw error;
    }
  }

  async getQuizAttempts(
    fileName: string,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<
    {
      attemptNumber: number;
      score?: number;
      completedAt?: string;
      timeTaken?: number;
      timeLimit?: number;
    }[]
  > {
    try {
      this.logger.log(
        `Retrieving quiz attempts for CV ${fileName} by ${requesterEmail}`,
      );
      const cvId = await this.cvService.resolveFileNameToCvId(fileName);

      const cvResult = await this.cvService['cvCollection'].get({
        ids: [cvId],
      });

      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      if (
        requesterRole !== 'admin' &&
        cvResult.metadatas[0]?.uploadedBy !== requesterEmail
      ) {
        this.logger.warn(
          `Unauthorized quiz attempts access by ${requesterEmail} for CV ${cvId}`,
        );
        throw new ForbiddenException(
          'You are not authorized to view quiz attempts for this CV',
        );
      }

      const result = await this.quizAttemptsCollection.get({
        where: { fileName },
      });

      const attempts = result.documents
        .map((doc) => JSON.parse(doc!))
        .sort((a, b) => a.attemptNumber - b.attemptNumber)
        .map((attempt) => ({
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          completedAt: attempt.completedAt,
          timeTaken: attempt.timeTaken,
          timeLimit: attempt.timeLimit,
        }));

      this.logger.log(
        `Found ${attempts.length} quiz attempts for CV ${fileName}`,
      );
      return attempts;
    } catch (error) {
      this.logger.error(
        'Quiz attempts retrieval failed',
        error.stack,
        error.message,
      );
      throw error;
    }
  }

  async getQuizzesForCv(
    fileName: string,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ quizId: string }> {
    try {
      this.logger.log(
        `Retrieving quizzes for CV ${fileName} by ${requesterEmail}`,
      );
      const cvId = await this.cvService.resolveFileNameToCvId(fileName);

      const cvResult = await this.cvService['cvCollection'].get({
        ids: [cvId],
      });

      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      if (
        requesterRole !== 'admin' &&
        cvResult.metadatas[0]?.uploadedBy !== requesterEmail
      ) {
        this.logger.warn(
          `Unauthorized quiz access by ${requesterEmail} for CV ${cvId}`,
        );
        throw new ForbiddenException(
          'You are not authorized to view quizzes for this CV',
        );
      }

      const result = await this.quizCollection.get({
        where: { fileName },
      });

      const quizzes = result.documents
        .map((doc) => JSON.parse(doc!))
        .filter((quiz) => quiz.completedAt) // Only completed quizzes
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      const latestQuizId = quizzes.length > 0 ? quizzes[0].quizId : '';
      this.logger.log(
        `Found ${quizzes.length} completed quizzes for CV ${fileName}`,
      );

      return { quizId: latestQuizId };
    } catch (error) {
      this.logger.error('Quiz retrieval failed', error.stack, error.message);
      throw error;
    }
  }

  async getAllQuizzes(
    requesterEmail: string,
    requesterRole: string,
  ): Promise<
    {
      quizId: string;
      fileName: string;
      createdBy: string;
      createdAt: string;
      candidateEmail: string;
    }[]
  > {
    try {
      this.logger.log(`Retrieving all quizzes for ${requesterEmail}`);
      const query =
        requesterRole === 'admin' ? undefined : { createdBy: requesterEmail };
      const result = await this.quizCollection.get({ where: query });

      const quizzes = result.documents.map((doc, index) => {
        const parsed = JSON.parse(doc!);
        return {
          quizId: String(parsed.quizId),
          fileName: String(parsed.fileName),
          createdBy: String(result.metadatas[index]!.createdBy),
          createdAt: String(parsed.createdAt),
          candidateEmail: String(parsed.candidateEmail || ''),
        };
      });

      this.logger.log(`Found ${quizzes.length} quizzes`);
      return quizzes;
    } catch (error) {
      this.logger.error(
        'All quizzes retrieval failed',
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
        return { fileName: '', score: 0, timeTaken: 0, completedAt: '' };
      }

      const quizDoc = JSON.parse(result.documents[0]);

      const cvId = quizDoc.cvId;

      const cvResult = await this.cvService['cvCollection'].get({
        ids: [cvId],
      });

      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        return { fileName: quizDoc.fileName, score: 0, timeTaken: 0, completedAt: '' };
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
        return { fileName: quizDoc.fileName, score: 0, timeTaken: 0, completedAt: '' };
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
    token: string,
    isAutoSubmit: boolean = false,
  ): Promise<void> {
    try {
      this.logger.log(`Submitting answers for quizId: ${quizId}`);

      const result = await this.quizCollection.get({ ids: [quizId] });

      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`Quiz ${quizId} not found`);
        throw new NotFoundException('Quiz not found');
      }

      const quizDoc = JSON.parse(result.documents[0]);

      if (quizDoc.secureToken !== token) {
        this.logger.warn(`Invalid token for quiz ${quizId}`);
        throw new ForbiddenException('Invalid quiz token');
      }

      if (quizDoc.completedAt) {
        this.logger.warn(`Quiz ${quizId} already completed`);
        throw new BadRequestException('Quiz already completed');
      }

      // Modified: Add 5-second grace period for auto-submissions
      const gracePeriod = isAutoSubmit ? 5 : 0;
      if (quizDoc.timeLimit && timeTaken > quizDoc.timeLimit + gracePeriod) {
        this.logger.warn(
          `Quiz ${quizId} submission time exceeded: ${timeTaken}s > ${
            quizDoc.timeLimit + gracePeriod
          }s`,
        );
        throw new BadRequestException('Submission time limit exceeded');
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

      // Update quiz in quizzes collection
      await this.quizCollection.upsert({
        ids: [quizId],
        documents: [JSON.stringify(quizDoc)],
        metadatas: [result.metadatas[0]!],
      });

      // Store attempt in quiz_attempts collection
      const attemptDocument = JSON.stringify({
        quizId,
        cvId: quizDoc.cvId,
        fileName: quizDoc.fileName,
        attemptNumber: quizDoc.attemptNumber,
        score,
        timeTaken,
        completedAt: quizDoc.completedAt,
        createdAt: quizDoc.createdAt,
        timeLimit: quizDoc.timeLimit,
      });

      await this.quizAttemptsCollection.add({
        ids: [`${quizId}_${quizDoc.attemptNumber}`],
        documents: [attemptDocument],
        metadatas: [
          {
            cvId: quizDoc.cvId,
            fileName: quizDoc.fileName,
            attemptNumber: quizDoc.attemptNumber,
          },
        ],
      });

      this.logger.log(
        `Quiz ${quizId} answers submitted: score=${score}%, attempt ${quizDoc.attemptNumber}`,
      );
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

      const quizId = quizLink.split('/').pop()?.split('?')[0];
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

      const cvResult = await this.cvService['cvCollection'].get({
        ids: [cvId],
      });

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
      this.logger.debug(`Email content: ${JSON.stringify(msg)}`);

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
