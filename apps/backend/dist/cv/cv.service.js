"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CvService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CvService = void 0;
const common_1 = require("@nestjs/common");
const chromadb_1 = require("chromadb");
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const prompts_1 = require("@langchain/core/prompts");
const gemini_chat_1 = require("../llm/gemini-chat");
const runnables_1 = require("@langchain/core/runnables");
const output_parsers_1 = require("@langchain/core/output_parsers");
const crypto = require("crypto");
class GeminiEmbeddingFunction {
    logger = new common_1.Logger(GeminiEmbeddingFunction.name);
    client;
    constructor(configService) {
        const GEMINI_API_KEY = configService.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) {
            this.logger.warn('GEMINI_API_KEY is not defined in .env — embedding features disabled');
            this.client = null;
            return;
        }
        this.client = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
        this.logger.log('Gemini client initialized successfully');
    }
    async generate(texts) {
        if (!this.client) {
            throw new Error('GEMINI_API_KEY is required for embeddings');
        }
        try {
            const model = this.client.getGenerativeModel({
                model: 'gemini-embedding-001',
            });
            const embeddings = [];
            for (const text of texts) {
                const result = await model.embedContent(text);
                const embedding = result.embedding.values;
                embeddings.push(embedding);
            }
            this.logger.log(`Generated embeddings for ${texts.length} texts`);
            return embeddings;
        }
        catch (error) {
            this.logger.error('Failed to generate embeddings', error.stack, error.message);
            throw new Error('Gemini embedding generation failed');
        }
    }
}
let CvService = CvService_1 = class CvService {
    chromaClient;
    configService;
    cvCollection;
    userCollection;
    chatHistoryCollection;
    logger = new common_1.Logger(CvService_1.name);
    embeddingFunction;
    uploadFolder = path.join(__dirname, '..', 'Cvfiles');
    constructor(chromaClient, configService) {
        this.chromaClient = chromaClient;
        this.configService = configService;
        this.embeddingFunction = new GeminiEmbeddingFunction(configService);
        this.chromaClient = new chromadb_1.ChromaClient({
            path: this.configService.get('CHROMADB_URL') ||
                'http://chromadb:8000',
        });
        this.initializeCollections();
    }
    async initializeCollections() {
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
        }
        catch (error) {
            this.logger.error('Failed to initialize ChromaDB collections', error.stack, error.message);
            throw new Error('ChromaDB initialization failed');
        }
    }
    async generateCvId() {
        try {
            const result = await this.cvCollection.get();
            const mainCvCount = result.ids.filter((id) => !id.includes('_chunk_')).length;
            const newId = `cv${mainCvCount + 1}`;
            this.logger.debug(`Generating CV ID: ${newId} (main CVs: ${mainCvCount}, total records: ${result.ids.length})`);
            return newId;
        }
        catch (error) {
            this.logger.error('Failed to generate CV ID', error.stack, error.message);
            throw new Error('CV ID generation failed');
        }
    }
    async resolveFileNameToCvId(fileName, retries = 3, delay = 1000) {
        try {
            this.logger.debug(`Attempting to resolve fileName: ${fileName} (Retries left: ${retries})`);
            const allCvs = await this.cvCollection.get();
            this.logger.debug(`Retrieved ${allCvs.ids.length} records from cvs collection: ${JSON.stringify(allCvs.ids)}`);
            for (let i = 0; i < allCvs.ids.length; i++) {
                if (allCvs.ids[i].includes('_chunk_'))
                    continue;
                try {
                    const doc = JSON.parse(allCvs.documents[i]);
                    if (doc.fileName.toLowerCase() === fileName.toLowerCase()) {
                        this.logger.debug(`Found matching main CV:
              ${allCvs.ids[i]}`);
                        return allCvs.ids[i];
                    }
                }
                catch (e) {
                    this.logger.error(`Failed to parse document for ID ${allCvs.ids[i]}: ${e.message}`);
                    continue;
                }
            }
            const chunks = allCvs.documents
                .map((doc, index) => ({
                id: allCvs.ids[index],
                doc: doc,
            }))
                .filter((item) => item.id.includes('_chunk_'));
            this.logger.debug(`Found ${chunks.length} chunks to check`);
            for (const chunk of chunks) {
                try {
                    const parsedChunk = JSON.parse(chunk.doc);
                    this.logger.debug(`Checking chunk ${chunk.id}: ${JSON.stringify(parsedChunk)}`);
                    if (parsedChunk.fileName.toLowerCase() === fileName.toLowerCase()) {
                        const cvId = chunk.id.split('_chunk_')[0];
                        this.logger.debug(`Found matching chunk, extracted cvId: ${cvId}`);
                        return cvId;
                    }
                }
                catch (e) {
                    this.logger.error(`Failed to parse chunk document for ID ${chunk.id}: ${e.message}`);
                    continue;
                }
            }
            if (retries > 0) {
                this.logger.debug(`No CV found for fileName: ${fileName}, retrying after ${delay}ms`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.resolveFileNameToCvId(fileName, retries - 1, delay);
            }
            this.logger.warn(`No CV found for fileName: ${fileName} after all retries`);
            throw new common_1.NotFoundException(`CV not found for fileName: ${fileName}`);
        }
        catch (error) {
            this.logger.error(`Failed to resolve fileName ${fileName}`, error.stack, error.message);
            throw error;
        }
    }
    async uploadCv(uploaderEmail, file, name) {
        try {
            const absoluteUploadFolder = path.resolve(this.uploadFolder);
            this.logger.log(`Upload folder path: ${absoluteUploadFolder}`);
            if (!fs.existsSync(this.uploadFolder)) {
                fs.mkdirSync(this.uploadFolder, { recursive: true });
                this.logger.log(`Created upload folder: ${absoluteUploadFolder}`);
            }
            const nameLower = name.toLowerCase();
            const existingCvs = await this.cvCollection.get({
                where: { uploadedBy: uploaderEmail },
            });
            this.logger.log(`Existing CVs: ${JSON.stringify(existingCvs.documents.map((doc) => JSON.parse(doc)))}`);
            const duplicateCv = existingCvs.documents.find((doc) => JSON.parse(doc).name?.toLowerCase() === nameLower);
            if (duplicateCv) {
                this.logger.warn(`Duplicate CV detected for ${uploaderEmail}, name: ${name}`);
                throw new common_1.BadRequestException('CV with this name already exists');
            }
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
            const userResult = await this.userCollection.get({
                where: { email: uploaderEmail },
            });
            if (userResult.ids.length === 0 || !userResult.documents[0]) {
                this.logger.warn(`User ${uploaderEmail} not found for CV linking`);
                throw new common_1.NotFoundException(`User ${uploaderEmail} not found`);
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
            const text = await this.extractTextFromPdf(filePath);
            this.logger.log(`Extracted text length: ${text.length} characters`);
            const chunks = this.splitTextIntoChunks(text, 500);
            this.logger.log(`Split text into ${chunks.length} chunks`);
            const embeddings = await this.embeddingFunction.generate(chunks);
            this.logger.log(`Generated ${embeddings.length} embeddings`);
            const chunkDocuments = chunks.map((chunk, index) => JSON.stringify({
                chunkIndex: index,
                text: chunk,
                cvId,
                uploadDate: new Date().toISOString(),
                name: name,
                fileName,
            }));
            const chunkMetadatas = chunks.map((_, index) => ({
                cvId,
                uploadedBy: uploaderEmail,
                chunkIndex: index,
                fileName,
            }));
            const chunkIds = chunks.map((_, index) => `${cvId}_chunk_${index}`);
            await this.cvCollection.add({
                ids: chunkIds,
                documents: chunkDocuments,
                metadatas: chunkMetadatas,
                embeddings,
            });
            this.logger.log(`Stored ${chunks.length} chunks for CV ${cvId} in ChromaDB`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            return { cvId, fileName };
        }
        catch (error) {
            this.logger.error('CV upload failed', error.stack, error.message);
            throw error;
        }
    }
    async extractTextFromPdf(filePath) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdf = await pdfParse(dataBuffer);
            return pdf.text;
        }
        catch (error) {
            this.logger.error(`Failed to extract text from ${filePath}`, error.stack, error.message);
            throw new Error('PDF text extraction failed');
        }
    }
    splitTextIntoChunks(text, maxTokens) {
        const words = text.split(/\s+/);
        const chunks = [];
        let currentChunk = [];
        let currentTokenCount = 0;
        for (const word of words) {
            const tokenEstimate = Math.ceil(word.length / 4);
            if (currentTokenCount + tokenEstimate > maxTokens) {
                chunks.push(currentChunk.join(' '));
                currentChunk = [word];
                currentTokenCount = tokenEstimate;
            }
            else {
                currentChunk.push(word);
                currentTokenCount += tokenEstimate;
            }
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join(' '));
        }
        return chunks.filter((chunk) => chunk.trim().length > 0);
    }
    async getCv(fileName, requesterEmail, requesterRole) {
        try {
            this.logger.log(`Retrieving CV for fileName ${fileName} by ${requesterEmail}`);
            const cvId = await this.resolveFileNameToCvId(fileName);
            const result = await this.cvCollection.get({ ids: [cvId] });
            this.logger.debug(`CV query result: ${JSON.stringify(result)}`);
            if (result.ids.length === 0 || !result.documents[0]) {
                this.logger.warn(`CV ${cvId} not found`);
                throw new common_1.NotFoundException('CV not found');
            }
            const cvDoc = JSON.parse(result.documents[0]);
            if (requesterRole !== 'admin' &&
                result.metadatas[0]?.uploadedBy !== requesterEmail) {
                this.logger.warn(`Unauthorized access attempt by ${requesterEmail} for CV ${cvId}`);
                throw new common_1.ForbiddenException('You are not authorized to view this CV');
            }
            const resolvedFileName = cvDoc.fileName || `${cvId}_cv.pdf`;
            const filePath = path.join(this.uploadFolder, resolvedFileName);
            if (!fs.existsSync(filePath)) {
                this.logger.warn(`CV file not found at: ${filePath}`);
                throw new common_1.NotFoundException('CV file not found');
            }
            this.logger.log(`CV ${cvId} retrieved successfully at: ${filePath}`);
            return { filePath, fileName: resolvedFileName };
        }
        catch (error) {
            this.logger.error('CV retrieval failed', error.stack, error.message);
            throw error;
        }
    }
    async updateCvName(cvId, name, requesterEmail, requesterRole) {
        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new common_1.BadRequestException('CV title is required');
        }
        const result = await this.cvCollection.get({ ids: [cvId] });
        if (result.ids.length === 0 || !result.documents[0]) {
            throw new common_1.NotFoundException('CV not found');
        }
        const metadata = result.metadatas[0] || {};
        if (requesterRole !== 'admin' &&
            metadata.uploadedBy !== requesterEmail) {
            throw new common_1.ForbiddenException('You cannot edit this CV');
        }
        const cvDoc = JSON.parse(result.documents[0]);
        await this.cvCollection.update({
            ids: [cvId],
            documents: [JSON.stringify({ ...cvDoc, name: trimmedName })],
            metadatas: [metadata],
        });
        this.logger.log(`Updated CV ${cvId} title to ${trimmedName}`);
    }
    async deleteCv(cvId, requesterEmail, requesterRole) {
        try {
            this.logger.log(`Deleting CV ${cvId}`);
            const result = await this.cvCollection.get({ ids: [cvId] });
            this.logger.debug(`CV query result: ${JSON.stringify(result)}`);
            if (result.ids.length === 0 || !result.documents[0]) {
                this.logger.warn(`CV ${cvId} not found`);
                throw new common_1.NotFoundException('CV not found');
            }
            if (requesterRole !== 'admin' &&
                result.metadatas[0]?.uploadedBy !== requesterEmail) {
                throw new common_1.ForbiddenException('You cannot delete this CV');
            }
            const cvDoc = JSON.parse(result.documents[0]);
            const fileName = cvDoc.fileName || `${cvId}_cv.pdf`;
            const filePath = path.join(this.uploadFolder, fileName);
            this.logger.debug(`Checking file at: ${filePath}`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.logger.log(`Deleted CV file: ${filePath}`);
            }
            else {
                this.logger.warn(`CV file not found at: ${filePath}`);
            }
            await this.cvCollection.delete({ ids: [cvId] });
            this.logger.log(`${cvId} deleted from collection`);
            const chunkResult = await this.cvCollection.get({ where: { cvId } });
            if (chunkResult.ids.length > 0) {
                await this.cvCollection.delete({ ids: chunkResult.ids });
                this.logger.log(`Deleted ${chunkResult.ids.length} chunks for CV ${cvId}`);
            }
            else {
                this.logger.debug(`No chunks found for CV ${cvId}`);
            }
            const chatResult = await this.chatHistoryCollection.get({
                where: { cvId },
            });
            if (chatResult.ids.length > 0) {
                await this.chatHistoryCollection.delete({ ids: chatResult.ids });
                this.logger.log(`Deleted ${chatResult.ids.length} chat entries for CV ${cvId}`);
            }
            else {
                this.logger.debug(`No chat history found for CV ${cvId}`);
            }
        }
        catch (error) {
            this.logger.error(`CV deletion failed for ${cvId}`, error.stack, error.message);
            throw error;
        }
    }
    async listCvs(requesterRole, requesterEmail) {
        try {
            this.logger.log(`Listing CVs for ${requesterEmail} with role ${requesterRole}`);
            let result;
            for (let attempt = 1; attempt <= 3; attempt++) {
                result = await this.cvCollection.get({
                    include: ['documents', 'metadatas'],
                });
                this.logger.log(`Attempt ${attempt}: Retrieved ${result.ids.length} CVs: ${JSON.stringify(result.ids)}`);
                if (result.ids.length > 0)
                    break;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            if (!result || result.ids.length === 0) {
                this.logger.warn(`No CVs found in cvCollection for ${requesterEmail}`);
                return [];
            }
            let mainCvCounter = 0;
            const mainCvs = result.documents
                .map((doc, index) => {
                if (!doc || result.ids[index].includes('_chunk_'))
                    return null;
                try {
                    const parsedDoc = JSON.parse(doc);
                    const fileName = parsedDoc.fileName || `${result.ids[index]}_cv.pdf`;
                    const filePath = path.join(this.uploadFolder, fileName);
                    this.logger.debug(`Processing CV: ${JSON.stringify({
                        id: result.ids[index],
                        fileName,
                        exists: fs.existsSync(filePath),
                    })}`);
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
                }
                catch (error) {
                    this.logger.error(`Failed to parse document for ID ${result.ids[index]}: ${doc}`, error.stack);
                    return null;
                }
            })
                .filter((cv) => cv !== null);
            this.logger.log(`Filtered ${mainCvs.length} main CVs`);
            const filteredCvs = requesterRole === 'admin'
                ? mainCvs
                : mainCvs.filter((cv) => cv.uploadedBy === requesterEmail);
            this.logger.log(`Returning ${filteredCvs.length} CVs for ${requesterEmail}`);
            return filteredCvs;
        }
        catch (error) {
            this.logger.error('List CVs failed', error.stack, error.message);
            throw error;
        }
    }
    async chatCv(fileName, chatCvDto, requesterEmail, requesterRole) {
        try {
            const cvId = await this.resolveFileNameToCvId(fileName);
            this.logger.log(`Chat request for CV ${cvId} (fileName: ${fileName}) by ${requesterEmail} with role ${requesterRole}`);
            const mainCv = await this.cvCollection.get({ ids: [cvId] });
            if (requesterRole !== 'admin' &&
                mainCv.metadatas[0]?.uploadedBy !== requesterEmail) {
                throw new common_1.ForbiddenException('You cannot chat with this CV');
            }
            const result = await this.cvCollection.get({ where: { cvId } });
            if (result.ids.length === 0 || !result.documents[0]) {
                this.logger.warn(`CV ${cvId} not found`);
                throw new common_1.NotFoundException('CV not found');
            }
            this.logger.debug(`Retrieved ${result.ids.length} chunks for CV ${cvId}`);
            const { message } = chatCvDto;
            this.logger.log(`Received message: ${message}`);
            const queryEmbedding = (await this.embeddingFunction.generate([message]))[0];
            this.logger.log(`Generated query embedding for: ${message}`);
            const queryResult = await this.cvCollection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: 5,
                where: { cvId },
            });
            this.logger.debug(`Query result: ${JSON.stringify(queryResult)}`);
            const context = queryResult.documents[0]
                .map((doc, index) => {
                const parsedDoc = JSON.parse(doc);
                return `Chunk ${parsedDoc.chunkIndex}:\n${parsedDoc.text}`;
            })
                .join('\n\n');
            this.logger.log(`Formatted context length: ${context.length} characters`);
            if (!context) {
                this.logger.warn(`No relevant chunks found for CV ${cvId}`);
                return { response: 'No relevant information found in the CV.' };
            }
            const llm = (0, gemini_chat_1.createGeminiChatModel)(this.configService, 0.7);
            const promptTemplate = prompts_1.PromptTemplate.fromTemplate(`
        You are an AI assistant answering questions about a candidate's CV. Use the following CV content to provide an accurate and concise response. If the information is not available, state so clearly.
  
        CV Content:
        {context}
  
        User Question: {question}
  
        Response:
      `);
            const chain = runnables_1.RunnableSequence.from([
                promptTemplate,
                llm,
                new output_parsers_1.StringOutputParser(),
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
        }
        catch (error) {
            this.logger.error('Chat CV failed', error.stack, error.message);
            throw error;
        }
    }
    async globalChatCv(chatCvDto, requesterEmail, requesterRole) {
        try {
            const { message } = chatCvDto;
            this.logger.log(`Global chat request by ${requesterEmail}: ${message}`);
            const queryEmbedding = (await this.embeddingFunction.generate([message]))[0];
            this.logger.log(`Generated query embedding for: ${message}`);
            const whereClause = requesterRole === 'admin'
                ? { chunkIndex: { $gt: -1 } }
                : {
                    $and: [
                        { chunkIndex: { $gt: -1 } },
                        { uploadedBy: requesterEmail },
                    ],
                };
            this.logger.debug(`Querying with where: ${JSON.stringify(whereClause)}`);
            const queryResult = await this.cvCollection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: 50,
                where: whereClause,
            });
            this.logger.debug(`Global query result: ${JSON.stringify(queryResult)}`);
            const cvGroups = {};
            queryResult.documents[0].forEach((doc, index) => {
                const parsedDoc = JSON.parse(doc);
                const cvId = parsedDoc.cvId;
                if (!cvGroups[cvId])
                    cvGroups[cvId] = [];
                cvGroups[cvId].push({
                    doc: parsedDoc,
                    metadata: queryResult.metadatas[0][index],
                });
            });
            const cvScores = Object.keys(cvGroups).map((cvId) => ({
                cvId,
                maxScore: Math.max(...cvGroups[cvId].map((_, i) => queryResult.distances[0][i] || 0)),
            }));
            const topCvIds = cvScores
                .sort((a, b) => b.maxScore - a.maxScore)
                .slice(0, 5)
                .map((c) => c.cvId);
            if (topCvIds.length === 0) {
                this.logger.warn('No relevant CVs found');
                return { response: 'No CVs match your query.' };
            }
            const mainCvResult = await this.cvCollection.get({
                ids: topCvIds,
                include: ['documents', 'metadatas'],
            });
            const context = mainCvResult.documents
                .map((doc, index) => {
                const parsedDoc = JSON.parse(doc);
                const cvId = mainCvResult.ids[index];
                const chunks = cvGroups[cvId]
                    ?.slice(0, 3)
                    .map((c) => `Chunk ${c.doc.chunkIndex}:\n${c.doc.text}`)
                    .join('\n\n');
                return `CV: ${parsedDoc.name} (Uploaded by: ${mainCvResult.metadatas[index]?.uploadedBy})\n${chunks || 'No chunks available'}`;
            })
                .join('\n\n');
            this.logger.log(`Global context length: ${context.length} characters`);
            if (!context) {
                this.logger.warn('No relevant CVs found');
                return { response: 'No CVs match your query.' };
            }
            const llm = (0, gemini_chat_1.createGeminiChatModel)(this.configService, 0.7);
            const promptTemplate = prompts_1.PromptTemplate.fromTemplate(`
        You are an AI assistant analyzing multiple CVs. Use the following CV content to answer the user's question about skills, languages, or other qualifications across all CVs. Provide a concise list of matching CVs, including CV name and uploader email, with brief relevant details. If no CVs match, state so clearly.

        CV Content:
        {context}

        User Question: {question}

        Response:
      `);
            const chain = runnables_1.RunnableSequence.from([
                promptTemplate,
                llm,
                new output_parsers_1.StringOutputParser(),
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
        }
        catch (error) {
            this.logger.error('Global chat failed', error.stack, error.message);
            throw error;
        }
    }
    async getChatHistory(fileName, requesterEmail, requesterRole) {
        try {
            this.logger.log(`Retrieving chat history for fileName ${fileName} by ${requesterEmail} with role ${requesterRole}`);
            const cvId = await this.resolveFileNameToCvId(fileName);
            this.logger.debug(`Resolved fileName ${fileName} to cvId ${cvId}`);
            const cvResult = await this.cvCollection.get({ ids: [cvId] });
            this.logger.debug(`CV query result: ${JSON.stringify(cvResult)}`);
            if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
                this.logger.warn(`CV ${cvId} not found`);
                throw new common_1.NotFoundException('CV not found');
            }
            if (requesterRole !== 'admin' &&
                cvResult.metadatas[0]?.uploadedBy !== requesterEmail) {
                this.logger.warn(`Unauthorized chat history access by ${requesterEmail} for CV ${cvId}`);
                throw new common_1.ForbiddenException('You are not authorized to view this chat history');
            }
            const whereClause = {
                $and: [{ cvId: cvId }, { userEmail: requesterEmail }],
            };
            this.logger.debug(`Querying chat_history with where: ${JSON.stringify(whereClause)}`);
            try {
                const chatResult = await this.chatHistoryCollection.get({
                    where: whereClause,
                });
                this.logger.debug(`Chat history query result: ${JSON.stringify(chatResult)}`);
                if (!chatResult.documents || chatResult.documents.length === 0) {
                    this.logger.debug('No chat history found');
                    return [];
                }
                const chatHistory = chatResult.documents
                    .map((doc) => {
                    try {
                        const parsedDoc = JSON.parse(doc);
                        return {
                            query: parsedDoc.query,
                            response: parsedDoc.response,
                            timestamp: parsedDoc.timestamp,
                        };
                    }
                    catch (parseError) {
                        this.logger.error(`Failed to parse chat document: ${doc}`, parseError.stack);
                        return null;
                    }
                })
                    .filter((entry) => entry !== null)
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                this.logger.log(`Retrieved ${chatHistory.length} chat entries for CV ${cvId} by ${requesterEmail}`);
                return chatHistory;
            }
            catch (chatQueryError) {
                this.logger.error(`Failed to query chat history collection: ${chatQueryError.message}`, chatQueryError.stack);
                throw new Error(`Failed to query chat history: ${chatQueryError.message}`);
            }
        }
        catch (error) {
            this.logger.error(`Chat history retrieval failed for fileName ${fileName}`, error.stack);
            throw error;
        }
    }
    async getGlobalChatHistory(requesterEmail, requesterRole) {
        try {
            this.logger.log(`Retrieving global chat history by ${requesterEmail}`);
            const whereClause = {
                $and: [
                    { cvId: 'global' },
                    { userEmail: requesterEmail },
                ],
            };
            this.logger.debug(`Querying chat_history with where: ${JSON.stringify(whereClause)}`);
            const chatResult = await this.chatHistoryCollection.get({
                where: whereClause,
            });
            this.logger.debug(`Global chat history query result: ${JSON.stringify(chatResult)}`);
            if (!chatResult.documents || chatResult.documents.length === 0) {
                this.logger.debug('No global chat history found');
                return [];
            }
            const chatHistory = chatResult.documents
                .map((doc) => {
                try {
                    const parsedDoc = JSON.parse(doc);
                    return {
                        query: parsedDoc.query,
                        response: parsedDoc.response,
                        timestamp: parsedDoc.timestamp,
                    };
                }
                catch (parseError) {
                    this.logger.error(`Failed to parse global chat document: ${doc}`, parseError.stack);
                    return null;
                }
            })
                .filter((entry) => entry !== null)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            this.logger.log(`Retrieved ${chatHistory.length} global chat entries for ${requesterEmail}`);
            return chatHistory;
        }
        catch (error) {
            this.logger.error(`Global chat history retrieval failed`, error.stack, error.message);
            throw error;
        }
    }
};
exports.CvService = CvService;
exports.CvService = CvService = CvService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [chromadb_1.ChromaClient,
        config_1.ConfigService])
], CvService);
//# sourceMappingURL=cv.service.js.map