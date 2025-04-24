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
class GeminiEmbeddingFunction {
    logger = new common_1.Logger(GeminiEmbeddingFunction.name);
    client;
    constructor(apiKey) {
        this.client = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.logger.log('Gemini client initialized');
    }
    async generate(texts) {
        try {
            const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
            const embeddings = [];
            for (const text of texts) {
                if (!text || text.trim() === '') {
                    this.logger.warn('Empty text provided, using dummy embedding');
                    embeddings.push(Array(768).fill(0));
                    continue;
                }
                const result = await model.embedContent(text);
                const embedding = result.embedding.values;
                this.logger.debug(`Generated embedding for text: ${text.slice(0, 50)}... (length: ${embedding.length})`);
                embeddings.push(embedding);
            }
            this.logger.log(`Generated embeddings for ${texts.length} texts`);
            return embeddings;
        }
        catch (error) {
            this.logger.error('Failed to generate embeddings', error.stack, error.message);
            this.logger.warn('Using dummy embeddings as fallback');
            return texts.map(() => Array(768).fill(0));
        }
    }
}
let CvService = CvService_1 = class CvService {
    chromaClient;
    cvCollection;
    userCollection;
    logger = new common_1.Logger(CvService_1.name);
    embeddingFunction;
    constructor(chromaClient) {
        this.chromaClient = chromaClient;
        const GEMINI_API_KEY = 'AIzaSyADup97tvmlHVXjRxOcqi2-7hWIypZVuMs';
        this.embeddingFunction = new GeminiEmbeddingFunction(GEMINI_API_KEY);
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
    async uploadCv(uploadCvDto, requesterRole) {
        if (requesterRole !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can upload CVs');
        }
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
            const cvDocument = JSON.stringify({ name, email, skills, assignedUserEmail: null });
            await this.cvCollection.add({
                ids: [cvId],
                documents: [cvDocument],
                metadatas: [{ email }],
            });
            this.logger.log(`CV uploaded: ${cvId}`);
            const verify = await this.cvCollection.get({ ids: [cvId] });
            if (verify.ids.length === 0) {
                this.logger.error(`CV ${cvId} not found after upload`);
                throw new Error('CV upload failed to persist');
            }
            this.logger.debug(`Verified CV ${cvId} in ChromaDB: ${JSON.stringify(verify.ids)}`);
            return { cvId };
        }
        catch (error) {
            this.logger.error('CV upload failed', error.stack, error.message);
            throw error;
        }
    }
    async assignCv(cvId, assignCvDto, requesterRole) {
        if (requesterRole !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can assign CVs');
        }
        const { userEmail } = assignCvDto;
        try {
            this.logger.log(`Assigning CV ${cvId} to user ${userEmail}`);
            const cvResult = await this.cvCollection.get({ ids: [cvId] });
            this.logger.debug(`CV query result: ${JSON.stringify(cvResult)}`);
            if (cvResult.ids.length === 0 || !cvResult.documents[0]) {
                this.logger.warn(`CV ${cvId} not found`);
                throw new common_1.NotFoundException('CV not found');
            }
            const userResult = await this.userCollection.get({ where: { email: userEmail } });
            this.logger.debug(`User query result: ${JSON.stringify(userResult)}`);
            if (userResult.ids.length === 0 || !userResult.documents[0]) {
                this.logger.warn(`User ${userEmail} not found`);
                throw new common_1.NotFoundException('User not found');
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
        }
        catch (error) {
            this.logger.error('CV assignment failed', error.stack, error.message);
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
};
exports.CvService = CvService;
exports.CvService = CvService = CvService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [chromadb_1.ChromaClient])
], CvService);
//# sourceMappingURL=cv.service.js.map