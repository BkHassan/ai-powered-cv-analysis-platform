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
class GeminiEmbeddingFunction {
    logger = new common_1.Logger(GeminiEmbeddingFunction.name);
    client;
    constructor(configService) {
        const GEMINI_API_KEY = configService.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) {
            this.logger.error('GEMINI_API_KEY is not defined in .env');
            throw new Error('GEMINI_API_KEY is required');
        }
        this.client = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
        this.logger.log('Gemini client initialized successfully');
    }
    async generate(texts) {
        try {
            const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
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
    logger = new common_1.Logger(CvService_1.name);
    embeddingFunction;
    constructor(chromaClient, configService) {
        this.chromaClient = chromaClient;
        this.configService = configService;
        this.embeddingFunction = new GeminiEmbeddingFunction(configService);
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
            const count = result.ids.length + 1;
            this.logger.debug(`Generating CV ID: cv${count} (existing CVs: ${result.ids.length})`);
            return `cv${count}`;
        }
        catch (error) {
            this.logger.error('Failed to generate CV ID', error.stack, error.message);
            throw new Error('CV ID generation failed');
        }
    }
    async uploadCv(uploadCvDto, uploaderEmail) {
        const { name, email, skills } = uploadCvDto;
        try {
            this.logger.log(`Checking for existing CV with email: ${email}`);
            const existingCv = await this.cvCollection.get({ where: { email } });
            if (existingCv.ids.length > 0) {
                this.logger.warn(`CV already exists for email: ${email}`);
                throw new common_1.ConflictException('CV already exists');
            }
            this.logger.log(`Uploading CV for ${email}`);
            const cvId = await this.generateCvId();
            const cvDocument = JSON.stringify({ name, email, skills, assignedUserEmail: null,
                uploadDate: new Date().toISOString()
            });
            await this.cvCollection.add({
                ids: [cvId],
                documents: [cvDocument],
                metadatas: [{ email, uploadedBy: uploaderEmail }],
            });
            await new Promise(resolve => setTimeout(resolve, 100));
            this.logger.log(`CV uploaded: ${cvId}`);
            const verify = await this.cvCollection.get({ ids: [cvId] });
            this.logger.debug(`Verify result: ${JSON.stringify(verify)}`);
            if (verify.ids.length === 0 || !verify.documents[0]) {
                this.logger.error(`CV ${cvId} not found after upload`);
                throw new Error('CV upload failed to persist');
            }
            this.logger.log(`Verified CV ${cvId} in ChromaDB`);
            return { cvId };
        }
        catch (error) {
            this.logger.error('CV upload failed', error.stack, error.message);
            throw error;
        }
    }
    async getCv(cvId, requesterEmail, requesterRole) {
        try {
            this.logger.log(`Retrieving CV ${cvId} for requester ${requesterEmail}`);
            const result = await this.cvCollection.get({ ids: [cvId] });
            this.logger.debug(`CV query result: ${JSON.stringify(result)}`);
            if (result.ids.length === 0 || !result.documents[0]) {
                this.logger.warn(`CV ${cvId} not found`);
                throw new common_1.NotFoundException('CV not found');
            }
            const cvDoc = JSON.parse(result.documents[0]);
            if (requesterRole !== 'admin' && cvDoc.assignedUserEmail !== requesterEmail) {
                this.logger.warn(`Unauthorized access attempt by ${requesterEmail} for CV ${cvId}`);
                throw new common_1.ForbiddenException('You are not authorized to view this CV');
            }
            this.logger.log(`CV ${cvId} retrieved successfully`);
            return cvDoc;
        }
        catch (error) {
            this.logger.error('CV retrieval failed', error.stack, error.message);
            throw error;
        }
    }
    async listCvs(requesterRole, requesterEmail) {
        try {
            const result = await this.cvCollection.get();
            this.logger.log(`Retrieved ${result.ids.length} CVs`);
            const allCvs = result.documents.map((doc, index) => {
                const parsedDoc = JSON.parse(doc);
                return {
                    realId: result.ids[index],
                    indexId: index + 1,
                    name: parsedDoc.name,
                    email: parsedDoc.email,
                    uploadDate: parsedDoc.uploadDate,
                    uploadedBy: result.metadatas[index].uploadedBy
                };
            });
            if (requesterRole == 'admin') {
                return allCvs;
            }
            else {
                const userCvs = allCvs.filter(cv => {
                    console.log(`Comparing cv.uploadedBy: ${cv.uploadedBy} with requesterEmail: ${requesterEmail}`);
                    return cv.uploadedBy === requesterEmail;
                });
                console.log(`Filtered User CVs: ${JSON.stringify(userCvs)}`);
                return userCvs;
            }
        }
        catch (error) {
            this.logger.error('List CVs failed', error.stack, error.message);
            throw error;
        }
    }
    async chatCv(cvId, chatCvDto, requesterEmail, requesterRole) {
        try {
            this.logger.log(`Chat request for CV ${cvId} by ${requesterEmail} with role ${requesterRole}`);
            const result = await this.cvCollection.get({ ids: [cvId] });
            if (result.ids.length === 0 || !result.documents[0]) {
                this.logger.warn(`CV ${cvId} not found`);
                throw new common_1.NotFoundException('CV not found');
            }
            const cvDoc = JSON.parse(result.documents[0]);
            this.logger.debug(`CV document: ${JSON.stringify(cvDoc)}`);
            if (requesterRole !== 'admin') {
                if (!cvDoc.assignedUserEmail || cvDoc.assignedUserEmail !== requesterEmail) {
                    this.logger.warn(`Unauthorized chat attempt by ${requesterEmail} for CV ${cvId}`);
                    throw new common_1.ForbiddenException('You are not authorized to chat with this CV');
                }
            }
            const { message } = chatCvDto;
            this.logger.log(`Received message: ${message}`);
            const response = `Mock response to "${message}" for CV ${cvId}. Skills: ${cvDoc.skills.join(', ')}.`;
            this.logger.log(`Chat response: ${response}`);
            return { response };
        }
        catch (error) {
            this.logger.error('Chat CV failed', error.stack, error.message);
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