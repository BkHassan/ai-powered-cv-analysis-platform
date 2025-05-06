import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChromaClient, Collection, IEmbeddingFunction } from 'chromadb';
// import { UploadCvDto } from './dto/upload-cv';
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
  private readonly logger = new Logger(CvService.name);
  private readonly embeddingFunction: IEmbeddingFunction;
  private readonly uploadFolder = path.join(__dirname, '..', 'Cvfiles');

  constructor(
    private readonly chromaClient: ChromaClient,
    private readonly configService: ConfigService,
  ) {
    this.embeddingFunction = new GeminiEmbeddingFunction(configService);
    this.chromaClient = new ChromaClient({ path: 'http://chromadb:8000' });
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

  async uploadCv(
    uploaderEmail: string,
    file: Express.Multer.File,
  ): Promise<{ cvId: string }> {
    try {
      const absoluteUploadFolder = path.resolve(this.uploadFolder);
      this.logger.log(`Upload folder path: ${absoluteUploadFolder}`);

      if (!fs.existsSync(this.uploadFolder)) {
        fs.mkdirSync(this.uploadFolder, { recursive: true });
        this.logger.log(`Created upload folder: ${absoluteUploadFolder}`);
      }

      // Check for duplicate CV by filename
      const fileNameWithoutExt = file.originalname
        .replace(/\.pdf$/, '')
        .toLowerCase();
      const existingCvs = await this.cvCollection.get({
        where: { uploadedBy: uploaderEmail },
      });
      this.logger.log(
        `Existing CVs: ${JSON.stringify(
          existingCvs.documents.map((doc: string) => JSON.parse(doc)),
        )}`,
      );
      const duplicateCv = existingCvs.documents.find(
        (doc: string) =>
          JSON.parse(doc).name?.toLowerCase() === fileNameWithoutExt,
      );
      if (duplicateCv) {
        this.logger.warn(
          `Duplicate CV detected for ${uploaderEmail}, filename: ${file.originalname}`,
        );
        throw new BadRequestException('CV already exists');
      }

      const cvId = await this.generateCvId();
      const fileName = `${cvId}_${file.originalname}`;
      const filePath = path.join(this.uploadFolder, fileName);
      this.logger.log(`Saving CV to: ${path.resolve(filePath)}`);

      fs.writeFileSync(filePath, file.buffer);
      this.logger.log(`CV file saved to: ${filePath}`);

      // Store original CV metadata (for compatibility with listCvs, getCv)
      const cvDocument = JSON.stringify({
        uploadDate: new Date().toISOString(),
        name: fileNameWithoutExt,
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
          name: fileNameWithoutExt,
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

  // Helper method to extract text from PDF
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

  // Helper method to split text into chunks
  private splitTextIntoChunks(text: string, maxTokens: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;

    for (const word of words) {
      const tokenEstimate = Math.ceil(word.length / 4); // Rough estimate: 1 token ≈ 4 characters
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
    cvId: string,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ filePath: string; fileName: string }> {
    try {
      this.logger.log(`Retrieving CV ${cvId} for requester ${requesterEmail}`);
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

      const fileName = cvDoc.fileName || `${cvId}_cv.pdf`; // Fallback filename
      const filePath = path.join(this.uploadFolder, fileName);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`CV file not found at: ${filePath}`);
        throw new NotFoundException('CV file not found');
      }

      this.logger.log(`CV ${cvId} retrieved successfully at: ${filePath}`);
      return { filePath, fileName };
    } catch (error) {
      this.logger.error('CV retrieval failed', error.stack, error.message);
      throw error;
    }
  }

  async deleteCv(cvId: string): Promise<void> {
    try {
      this.logger.log(`Deleting CV ${cvId}`);

      // Check if CV exists
      const result = await this.cvCollection.get({ ids: [cvId] });
      this.logger.debug(`CV query result: ${JSON.stringify(result)}`);
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      // Get file path from CV document
      const cvDoc = JSON.parse(result.documents[0]);
      const fileName = cvDoc.fileName || `${cvId}_cv.pdf`; // Fallback filename
      const filePath = path.join(this.uploadFolder, fileName);
      this.logger.debug(`Checking file at: ${filePath}`);

      // Delete file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted CV file: ${filePath}`);
      } else {
        this.logger.warn(`CV file not found at: ${filePath}`);
      }

      // Delete CV from collection
      await this.cvCollection.delete({ ids: [cvId] });
      this.logger.log(`${cvId} deleted from collection`);

      // Delete associated chunks
      const chunkResult = await this.cvCollection.get({ where: { cvId } });
      if (chunkResult.ids.length > 0) {
        await this.cvCollection.delete({ ids: chunkResult.ids });
        this.logger.log(
          `Deleted ${chunkResult.ids.length} chunks for CV ${cvId}`,
        );
      } else {
        this.logger.debug(`No chunks found for CV ${cvId}`);
      }
      
      // Delete associated chat history
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

      // Filter main CV records (exclude chunks)
      let mainCvCounter = 0;
      const mainCvs = result.documents
        .map((doc, index) => {
          if (result.ids[index].includes('_chunk_')) return null; // Skip chunks
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
            downloadUrl: `/cv/${result.ids[index]}`, // For frontend streaming
          };
        })
        .filter((cv) => cv !== null); // Remove null entries (chunks)

      this.logger.log(`Filtered ${mainCvs.length} main CVs`);

      if (requesterRole === 'admin') {
        return mainCvs;
      } else {
        const userCvs = mainCvs.filter((cv) => {
          this.logger.debug(
            `Comparing cv.uploadedBy: ${cv.uploadedBy} with requesterEmail: ${requesterEmail}`,
          );
          return cv.uploadedBy === requesterEmail;
        });
        this.logger.debug(`Filtered User CVs: ${JSON.stringify(userCvs)}`);
        return userCvs;
      }
    } catch (error) {
      this.logger.error('List CVs failed', error.stack, error.message);
      throw error;
    }
  }

  async chatCv(
    cvId: string,
    chatCvDto: ChatCvDto,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ response: string }> {
    try {
      this.logger.log(
        `Chat request for CV ${cvId} by ${requesterEmail} with role ${requesterRole}`,
      );

      // Verify CV exists
      const result = await this.cvCollection.get({ where: { cvId } });
      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }
      this.logger.debug(`Retrieved ${result.ids.length} chunks for CV ${cvId}`);

      const { message } = chatCvDto;
      this.logger.log(`Received message: ${message}`);

      // Convert query to embedding
      const queryEmbedding = (
        await this.embeddingFunction.generate([message])
      )[0];
      this.logger.log(`Generated query embedding for: ${message}`);

      // Perform vector similarity search
      const queryResult = await this.cvCollection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 5,
        where: { cvId }, // Restrict to chunks of this CV
      });
      this.logger.debug(`Query result: ${JSON.stringify(queryResult)}`);

      // Format retrieved chunks
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

      // Initialize Open AI
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

      // Create prompt template
      const promptTemplate = PromptTemplate.fromTemplate(`
        You are an AI assistant answering questions about a candidate's CV. Use the following CV content to provide an accurate and concise response. If the information is not available, state so clearly.
  
        CV Content:
        {context}
  
        User Question: {question}
  
        Response:
      `);

      // Create RAG chain
      const chain = RunnableSequence.from([
        {
          context: () => context,
          question: new RunnablePassthrough(),
        },
        promptTemplate,
        llm,
        new StringOutputParser(),
      ]);

      // Generate response
      const response = await chain.invoke(message);
      this.logger.log(`Chat response: ${response}`);

      //store chat in chat_history
      const chatId = `chat_${cvId}_${Date.now()}`;
      const chatDocument = JSON.stringify({
        cvId,
        userEmail: requesterEmail,
        query: message,
        response,
        timestamp: new Date().toISOString(),
      });
      const chatEmbedding = queryEmbedding; // Reuse query embedding
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
    cvId: string,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ query: string; response: string; timestamp: string }[]> {
    try {
      this.logger.log(
        `Retrieving chat history for CV ${cvId} by ${requesterEmail}`,
      );

      // Verify CV exists
      const cvResult = await this.cvCollection.get({ ids: [cvId] });
      if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
        this.logger.warn(`CV ${cvId} not found`);
        throw new NotFoundException('CV not found');
      }

      // Check authorization
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

      // Get chat history
      // Get chat history with explicit $and operator
      this.logger.debug(
        `Querying chat_history with where: ${JSON.stringify({
          $and: [{ cvId: cvId }, { userEmail: requesterEmail }],
        })}`
      );
      const chatResult = await this.chatHistoryCollection.get({
        where: {
          $and: [
            { cvId: cvId },
            { userEmail: requesterEmail }
          ]
        }
      });
      this.logger.log(
        `Retrieved ${chatResult.ids.length} chat entries for CV ${cvId}`,
      );

      // Format chat history
      const chatHistory = chatResult.documents
        .map((doc) => {
          const parsedDoc = JSON.parse(doc!);
          return {
            query: parsedDoc.query,
            response: parsedDoc.response,
            timestamp: parsedDoc.timestamp,
          };
        })
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ); // Sort by timestamp

      return chatHistory;
    } catch (error) {
      this.logger.error(
        'Chat history retrieval failed',
        error.stack,
        error.message,
      );
      throw error;
    }
  }
}
