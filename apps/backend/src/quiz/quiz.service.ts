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
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import * as sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
import { CvService } from '../cv/cv.service';
import * as crypto from 'crypto';

@Injectable()
export class QuizService {
  private quizCollection: Collection;
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
      this.logger.log('Quiz ChromaDB collection initialized');
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
        this.logger.error(`Failed to parse skills response: ${cleanedResponse}`, e);
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
    candidateEmail: string,
    questionCount: number = 5,
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
      this.logger.log(`Generating quiz for fileName: ${fileName} with ${questionCount} questions`);
  
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
        You are an AI assistant tasked with generating a technical quiz based on a candidate's skills and proficiency level. The skills are: {skills}. The proficiency level is: {level}. Generate a quiz with {questionCount} multiple-choice questions, each with 4 options and one correct answer. The questions should be appropriate for the given proficiency level (beginner, intermediate, or advanced).
  
        Provide the output as a JSON object, without wrapping it in markdown code blocks (e.g., \`\`\`json). Example format:
        {
          "questions": [
            {
              "id": "q1",
              "text": "Question text",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
              "correct": 0
            }
          ]
        }
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
  
      // Strip markdown code blocks if present
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
        this.logger.error(`Failed to parse quiz response: ${cleanedResponse}`, e);
        throw new Error('Failed to parse quiz response');
      }
  
      // Validate the number of questions
      if (parsedResponse.questions.length !== questionCount) {
        this.logger.warn(
          `Expected ${questionCount} questions, but received ${parsedResponse.questions.length}`,
        );
        throw new BadRequestException(
          `Generated quiz does not contain the requested number of questions (${questionCount})`,
        );
      }
  
      const quizId = uuidv4();
      const secureToken = crypto.randomBytes(16).toString('hex');
      const appUrl =
        this.configService.get<string>('NEXT_PUBLIC_APP_URL') ||
        'http://localhost:3000';
      const quizLink = `${appUrl}/quiz/${quizId}?token=${secureToken}`;
  
      const quizDocument = JSON.stringify({
        quizId,
        cvId,
        fileName,
        questions: parsedResponse.questions,
        secureToken,
        createdAt: new Date().toISOString(),
        createdBy: requesterEmail,
      });
  
      await this.quizCollection.add({
        ids: [quizId],
        documents: [quizDocument],
        metadatas: [{ cvId, fileName, createdBy: requesterEmail }],
      });
  
      await this.sendQuizEmail(
        candidateEmail,
        quizLink,
        requesterEmail,
        requesterRole,
      );
  
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

  async getQuiz(
    quizId: string,
    token: string,
  ): Promise<{
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
      if (quizDoc.secureToken !== token) {
        this.logger.warn(`Invalid token for quiz ${quizId}`);
        throw new ForbiddenException('Invalid quiz token');
      }
      return {
        quizId: quizDoc.quizId,
        cvId: quizDoc.cvId,
        fileName: quizDoc.fileName,
        questions: quizDoc.questions,
        completedAt: quizDoc.completedAt,
      };
    } catch (error) {
      this.logger.error('Quiz retrieval failed', error.stack, error.message);
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
    token: string,
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