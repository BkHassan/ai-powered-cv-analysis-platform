import { Injectable, Logger, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { ChromaClient, Collection, IEmbeddingFunction } from 'chromadb';
import { UploadCvDto } from './dto/upload-cv';
import { AssignCvDto } from './dto/assign-cv';
import { ChatCvDto } from './dto/chat-cv.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

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
      const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddings: number[][] = [];
      for (const text of texts) {
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        embeddings.push(embedding);
      }
      this.logger.log(`Generated embeddings for ${texts.length} texts`);
      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate embeddings', error.stack, error.message);
      throw new Error('Gemini embedding generation failed');
    }
  }
}

@Injectable()
export class CvService {
  private cvCollection: Collection;
  private userCollection: Collection;
  private readonly logger = new Logger(CvService.name);
  private readonly embeddingFunction: IEmbeddingFunction;

  constructor(
    private readonly chromaClient: ChromaClient,
    private readonly configService: ConfigService,
  ) {
    this.embeddingFunction = new GeminiEmbeddingFunction(configService);
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
      this.logger.log('ChromaDB collections initialized');
    } catch (error) {
      this.logger.error('Failed to initialize ChromaDB collections', error.stack, error.message);
      throw new Error('ChromaDB initialization failed');
    }
  }

  private async generateCvId(): Promise<string> {
    try {
      const result = await this.cvCollection.get();
      const count = result.ids.length + 1;
      this.logger.debug(`Generating CV ID: cv${count} (existing CVs: ${result.ids.length})`);
      return `cv${count}`;
    } catch (error) {
      this.logger.error('Failed to generate CV ID', error.stack, error.message);
      throw new Error('CV ID generation failed');
    }
  }

  async uploadCv(uploadCvDto: UploadCvDto, requesterRole: string): Promise<{ cvId: string }> {
    if (requesterRole !== 'admin') {
      throw new ForbiddenException('Only admins can upload CVs');
    }

    const { name, email, skills } = uploadCvDto;
    try {
      this.logger.log(`Checking for existing CV with email: ${email}`);
      const existingCv = await this.cvCollection.get({ where: { email } });
      if (existingCv.ids.length > 0) {
        this.logger.warn(`CV already exists for email: ${email}`);
        throw new ConflictException('CV already exists');
      }

      this.logger.log(`Uploading CV for ${email}`);
      const cvId = await this.generateCvId();
      const cvDocument = JSON.stringify({ name, email, skills, assignedUserEmail: null });
      await this.cvCollection.add({
        ids: [cvId],
        documents: [cvDocument],
        metadatas: [{ email }],
      });
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure SQLite write
      this.logger.log(`CV uploaded: ${cvId}`);

      // Verify persistence
      const verify = await this.cvCollection.get({ ids: [cvId] });
      this.logger.debug(`Verify result: ${JSON.stringify(verify)}`);
      if (verify.ids.length === 0 || !verify.documents[0]) {
        this.logger.error(`CV ${cvId} not found after upload`);
        throw new Error('CV upload failed to persist');
      }
      this.logger.log(`Verified CV ${cvId} in ChromaDB`);

      return { cvId };
    } catch (error) {
      this.logger.error('CV upload failed', error.stack, error.message);
      throw error;
    }
  }

  async assignCv(cvId: string, assignCvDto: AssignCvDto, requesterRole: string): Promise<void> {
    if (requesterRole !== 'admin') {
      throw new ForbiddenException('Only admins can assign CVs');
    }

    const { userEmail } = assignCvDto;
    try {
      this.logger.log(`Assigning CV ${cvId} to user ${userEmail}`);
      const cvResult = await this.cvCollection.get({ ids: [cvId] });
      this.logger.debug(`CV query result: ${JSON.stringify(cvResult)}`);
      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      const userResult = await this.userCollection.get({ where: { email: userEmail } });
      this.logger.debug(`User query result: ${JSON.stringify(userResult)}`);
      if (userResult.ids.length === 0 || !userResult.documents[0]) {
        this.logger.warn(`User ${userEmail} not found`);
        throw new NotFoundException('User not found');
      }

      const cvDoc = JSON.parse(cvResult.documents[0]);
      const updatedCvDoc = JSON.stringify({ ...cvDoc, assignedUserEmail: userEmail });

      await this.cvCollection.update({
        ids: [cvId],
        documents: [updatedCvDoc],
        metadatas: [{ email: cvDoc.email }],
      });

      const userDoc = JSON.parse(userResult.documents[0]);
      const updatedUserDoc = JSON.stringify({
        ...userDoc,
        cv_id: [...(userDoc.cv_id || []), cvId],
      });

      await this.userCollection.update({
        ids: [userResult.ids[0]],
        documents: [updatedUserDoc],
        metadatas: [{ email: userEmail }],
      });

      this.logger.log(`CV ${cvId} assigned to user ${userEmail}`);
    } catch (error) {
      this.logger.error('CV assignment failed', error.stack, error.message);
      throw error;
    }
  }

  async getCv(cvId: string, requesterEmail: string, requesterRole: string): Promise<any> {
    try {
      this.logger.log(`Retrieving CV ${cvId} for requester ${requesterEmail}`);
      const result = await this.cvCollection.get({ ids: [cvId] });
      this.logger.debug(`CV query result: ${JSON.stringify(result)}`);
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      const cvDoc = JSON.parse(result.documents[0]);
      if (requesterRole !== 'admin' && cvDoc.assignedUserEmail !== requesterEmail) {
        this.logger.warn(`Unauthorized access attempt by ${requesterEmail} for CV ${cvId}`);
        throw new ForbiddenException('You are not authorized to view this CV');
      }

      this.logger.log(`CV ${cvId} retrieved successfully`);
      return cvDoc;
    } catch (error) {
      this.logger.error('CV retrieval failed', error.stack, error.message);
      throw error;
    }
  }

  // list all cv for admin only
  async listCvs(requesterRole: string): Promise<any[]> {
    if (requesterRole !== 'admin') {
      this.logger.warn(`Unauthorized attempt to list CVs by non-admin`);
      throw new ForbiddenException('Only admins can list all CVs');
    }

    try {
      const result = await this.cvCollection.get();
      this.logger.log(`Retrieved ${result.ids.length} CVs`);
      return result.documents.map((doc, index) => ({
        cvId: result.ids[index],
        ...JSON.parse(doc!),
      }));
    } catch (error) {
      this.logger.error('List CVs failed', error.stack, error.message);
      throw error;
    }
  }

  // basic chat
  async chatCv(cvId: string, chatCvDto: ChatCvDto, requesterEmail: string, requesterRole: string): Promise<{ response: string }> {
    try {
      this.logger.log(`Chat request for CV ${cvId} by ${requesterEmail} with role ${requesterRole}`);
      const result = await this.cvCollection.get({ ids: [cvId] });
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      const cvDoc = JSON.parse(result.documents[0]);
      this.logger.debug(`CV document: ${JSON.stringify(cvDoc)}`);

      if (requesterRole !== 'admin') {
        if (!cvDoc.assignedUserEmail || cvDoc.assignedUserEmail !== requesterEmail) {
          this.logger.warn(`Unauthorized chat attempt by ${requesterEmail} for CV ${cvId}`);
          throw new ForbiddenException('You are not authorized to chat with this CV');
        }
      }

      const { message } = chatCvDto;
      this.logger.log(`Received message: ${message}`);

      // Mock response (replace with OpenAI integration in Phase 2)
      const response = `Mock response to "${message}" for CV ${cvId}. Skills: ${cvDoc.skills.join(', ')}.`;
      this.logger.log(`Chat response: ${response}`);

      return { response };
    } catch (error) {
      this.logger.error('Chat CV failed', error.stack, error.message);
      throw error;
    }
  }

}