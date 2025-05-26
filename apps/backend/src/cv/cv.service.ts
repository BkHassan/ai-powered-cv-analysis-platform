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
import { v4 as uuidv4 } from 'uuid';
import { RunnableLike } from '@langchain/core/runnables';

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
    this.chromaClient = new ChromaClient({
      path:
        this.configService.get<string>('CHROMADB_URL') ||
        'http://chromadb:8000',
    });
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

  async resolveFileNameToCvId(
    fileName: string,
    retries = 3,
    delay = 1000,
  ): Promise<string> {
    try {
      this.logger.debug(
        `Attempting to resolve fileName: ${fileName} (Retries left: ${retries})`,
      );

      // First try: get all documents and find the main CV
      const allCvs = await this.cvCollection.get();
      this.logger.debug(
        `Retrieved ${
          allCvs.ids.length
        } records from cvs collection: ${JSON.stringify(allCvs.ids)}`,
      );

      // Find the main CV (non-chunk) document that matches the fileName
      for (let i = 0; i < allCvs.ids.length; i++) {
        if (allCvs.ids[i].includes('_chunk_')) continue;

        try {
          const doc = JSON.parse(allCvs.documents[i]!);
          if (doc.fileName.toLowerCase() === fileName.toLowerCase()) {
            this.logger.debug(`Found matching main CV:
              ${allCvs.ids[i]}`);
            return allCvs.ids[i];
          }
        } catch (e) {
          this.logger.error(
            `Failed to parse document for ID ${allCvs.ids[i]}: ${e.message}`,
          );
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
      this.logger.debug(`Found ${chunks.length} chunks to check`);
      for (const chunk of chunks) {
        try {
          const parsedChunk = JSON.parse(chunk.doc!);
          this.logger.debug(
            `Checking chunk ${chunk.id}: ${JSON.stringify(parsedChunk)}`,
          );
          if (parsedChunk.fileName.toLowerCase() === fileName.toLowerCase()) {
            // Extract the base cvId from the chunk id (e.g., "cv1_chunk_0" -> "cv1")
            const cvId = chunk.id.split('_chunk_')[0];
            this.logger.debug(`Found matching chunk, extracted cvId: ${cvId}`);
            return cvId;
          }
        } catch (e) {
          this.logger.error(
            `Failed to parse chunk document for ID ${chunk.id}: ${e.message}`,
          );
          continue;
        }
      }

      if (retries > 0) {
        this.logger.debug(
          `No CV found for fileName: ${fileName}, retrying after ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.resolveFileNameToCvId(fileName, retries - 1, delay);
      }
      this.logger.warn(
        `No CV found for fileName: ${fileName} after all retries`,
      );
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
  ): Promise<{ cvId: string; fileName: string }> {
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
      this.logger.debug(`Storing CV metadata for ${cvId}: ${cvDocument}`);

      await this.cvCollection.add({
        ids: [cvId],
        documents: [cvDocument],
        metadatas: [{ uploadedBy: uploaderEmail }],
      });
      this.logger.log(`Stored CV metadata for ${cvId}`);

      // Update user's cv_id array in userCollection
      const userResult = await this.userCollection.get({
        where: { email: uploaderEmail },
      });
      if (userResult.ids.length === 0 || !userResult.documents[0]) {
        this.logger.warn(`User ${uploaderEmail} not found for CV linking`);
        throw new NotFoundException(`User ${uploaderEmail} not found`);
      }
      const userDoc = JSON.parse(userResult.documents[0]);
      const updatedCvIds = [...(userDoc.cv_id || []), cvId];
      const updatedUserDoc = JSON.stringify({
        ...userDoc,
        cv_id: updatedCvIds,
      });
      await this.userCollection.update({
        ids: [userResult.ids[0]],
        documents: [updatedUserDoc],
        metadatas: [{ email: uploaderEmail }],
      });

      this.logger.log(`Updated user ${uploaderEmail} with cvId ${cvId}`);
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
      await new Promise((resolve) => setTimeout(resolve, 3000));

      return { cvId, fileName };
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
      this.logger.log(
        `Listing CVs for ${requesterEmail} with role ${requesterRole}`,
      );

      // Retry up to 3 times to handle indexing delays
      let result;
      for (let attempt = 1; attempt <= 3; attempt++) {
        result = await this.cvCollection.get({
          include: ['documents', 'metadatas'] as any,
        });
        this.logger.log(
          `Attempt ${attempt}: Retrieved ${
            result.ids.length
          } CVs: ${JSON.stringify(result.ids)}`,
        );
        if (result.ids.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!result || result.ids.length === 0) {
        this.logger.warn(`No CVs found in cvCollection for ${requesterEmail}`);
        return [];
      }

      let mainCvCounter = 0;
      const mainCvs = result.documents
        .map((doc, index) => {
          if (!doc || result.ids[index].includes('_chunk_')) return null;

          try {
            const parsedDoc = JSON.parse(doc);
            const fileName =
              parsedDoc.fileName || `${result.ids[index]}_cv.pdf`;
            const filePath = path.join(this.uploadFolder, fileName);

            this.logger.debug(
              `Processing CV: ${JSON.stringify({
                id: result.ids[index],
                fileName,
                exists: fs.existsSync(filePath),
              })}`,
            );

            return {
              realId: result.ids[index],
              indexId: ++mainCvCounter,
              name: parsedDoc.name || 'CV',
              email: result.metadatas[index]?.uploadedBy || 'unknown',
              uploadDate: parsedDoc.uploadDate || new Date().toISOString(),
              uploadedBy: result.metadatas[index]?.uploadedBy || 'unknown',
              filePath: fs.existsSync(filePath) ? filePath : null,
              fileName,
              downloadUrl: `/cv/${fileName}`,
            };
          } catch (error) {
            this.logger.error(
              `Failed to parse document for ID ${result.ids[index]}: ${doc}`,
              error.stack,
            );
            return null;
          }
        })
        .filter((cv) => cv !== null);

      this.logger.log(`Filtered ${mainCvs.length} main CVs`);

      const filteredCvs =
        requesterRole === 'admin'
          ? mainCvs
          : mainCvs.filter((cv) => cv.uploadedBy === requesterEmail);

      this.logger.log(
        `Returning ${filteredCvs.length} CVs for ${requesterEmail}`,
      );
      return filteredCvs;
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
        promptTemplate,
        llm as unknown as RunnableLike<any, any>,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        context,
        question: message,
      });
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

  async globalChatCv(
    chatCvDto: ChatCvDto,
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ response: string }> {
    try {
      const { message } = chatCvDto;
      this.logger.log(`Global chat request by ${requesterEmail}: ${message}`);

      const queryEmbedding = (
        await this.embeddingFunction.generate([message])
      )[0];
      this.logger.log(`Generated query embedding for: ${message}`);

      // Define the where clause based on user role
      const whereClause: Where =
        requesterRole === 'admin'
          ? { chunkIndex: { $gt: -1 } } // Only chunks
          : {
              $and: [
                { chunkIndex: { $gt: -1 } },
                { uploadedBy: requesterEmail }, // Restrict to user's own CVs
              ],
            };
      this.logger.debug(`Querying with where: ${JSON.stringify(whereClause)}`);

      // Query all CV chunks, limit to 50 to avoid overload
      const queryResult = await this.cvCollection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 50,
        where: whereClause, // Only chunks
      });
      this.logger.debug(`Global query result: ${JSON.stringify(queryResult)}`);

      // Group chunks by cvId
      const cvGroups: { [cvId: string]: { doc: any; metadata: any }[] } = {};
      queryResult.documents[0].forEach((doc, index) => {
        const parsedDoc = JSON.parse(doc!);
        const cvId = parsedDoc.cvId;
        if (!cvGroups[cvId]) cvGroups[cvId] = [];
        cvGroups[cvId].push({
          doc: parsedDoc,
          metadata: queryResult.metadatas[0][index],
        });
      });

      // Limit to top 5 CVs by max similarity score
      const cvScores = Object.keys(cvGroups).map((cvId) => ({
        cvId,
        maxScore: Math.max(
          ...cvGroups[cvId].map((_, i) => queryResult.distances![0][i] || 0),
        ),
      }));
      const topCvIds = cvScores
        .sort((a, b) => b.maxScore - a.maxScore)
        .slice(0, 5)
        .map((c) => c.cvId);

      if (topCvIds.length === 0) {
        this.logger.warn('No relevant CVs found');
        return { response: 'No CVs match your query.' };
      }

      // Fetch main CV documents for top CVs
      const mainCvResult = await this.cvCollection.get({
        ids: topCvIds,
        include: ['documents', 'metadatas'] as any,
      });
      const context = mainCvResult.documents
        .map((doc, index) => {
          const parsedDoc = JSON.parse(doc!);
          const cvId = mainCvResult.ids[index];
          const chunks = cvGroups[cvId]
            ?.slice(0, 3) // Limit to 3 chunks per CV
            .map((c) => `Chunk ${c.doc.chunkIndex}:\n${c.doc.text}`)
            .join('\n\n');
          return `CV: ${parsedDoc.name} (Uploaded by: ${
            mainCvResult.metadatas[index]?.uploadedBy
          })\n${chunks || 'No chunks available'}`;
        })
        .join('\n\n');

      this.logger.log(`Global context length: ${context.length} characters`);

      if (!context) {
        this.logger.warn('No relevant CVs found');
        return { response: 'No CVs match your query.' };
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
        You are an AI assistant analyzing multiple CVs. Use the following CV content to answer the user's question about skills, languages, or other qualifications across all CVs. Provide a concise list of matching CVs, including CV name and uploader email, with brief relevant details. If no CVs match, state so clearly.

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

      const response = await chain.invoke({
        context,
        question: message,
      });
      this.logger.log(`Global chat response: ${response}`);

      const chatId = `chat_global_${Date.now()}`;
      const chatDocument = JSON.stringify({
        cvId: 'global',
        userEmail: requesterEmail,
        query: message,
        response,
        timestamp: new Date().toISOString(),
      });
      const chatEmbedding = queryEmbedding;
      await this.chatHistoryCollection.add({
        ids: [chatId],
        documents: [chatDocument],
        metadatas: [{ cvId: 'global', userEmail: requesterEmail }],
        embeddings: [chatEmbedding],
      });
      this.logger.log(`Stored global chat entry ${chatId}`);

      return { response };
    } catch (error) {
      this.logger.error('Global chat failed', error.stack, error.message);
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
      );
      throw error;
    }
  }

  async getGlobalChatHistory(
    requesterEmail: string,
    requesterRole: string,
  ): Promise<{ query: string; response: string; timestamp: string }[]> {
    try {
      this.logger.log(`Retrieving global chat history by ${requesterEmail}`);

      const whereClause: Where = {
        $and: [
          { cvId: 'global' } as Where,
          { userEmail: requesterEmail } as Where,
        ],
      };
      this.logger.debug(
        `Querying chat_history with where: ${JSON.stringify(whereClause)}`,
      );

      const chatResult = await this.chatHistoryCollection.get({
        where: whereClause,
      });
      this.logger.debug(
        `Global chat history query result: ${JSON.stringify(chatResult)}`,
      );

      if (!chatResult.documents || chatResult.documents.length === 0) {
        this.logger.debug('No global chat history found');
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
              `Failed to parse global chat document: ${doc}`,
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
        `Retrieved ${chatHistory.length} global chat entries for ${requesterEmail}`,
      );

      return chatHistory;
    } catch (error) {
      this.logger.error(
        `Global chat history retrieval failed`,
        error.stack,
        error.message,
      );
      throw error;
    }
  }
}
