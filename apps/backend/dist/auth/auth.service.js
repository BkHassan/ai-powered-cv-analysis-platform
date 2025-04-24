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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const chromadb_1 = require("chromadb");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const generative_ai_1 = require("@google/generative-ai");
const uuid_1 = require("uuid");
class GeminiEmbeddingFunction {
    logger = new common_1.Logger(GeminiEmbeddingFunction.name);
    client;
    constructor() {
        const GEMINI_API_KEY = 'AIzaSyADup97tvmlHVXjRxOcqi2-7hWIypZVuMs';
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
let AuthService = AuthService_1 = class AuthService {
    jwtService;
    chromaClient;
    userCollection;
    resetTokenCollection;
    logger = new common_1.Logger(AuthService_1.name);
    embeddingFunction = new GeminiEmbeddingFunction();
    constructor(jwtService, chromaClient) {
        this.jwtService = jwtService;
        this.chromaClient = chromaClient;
        this.initializeCollections();
    }
    async initializeCollections() {
        try {
            this.userCollection = await this.chromaClient.getOrCreateCollection({
                name: 'users',
                embeddingFunction: this.embeddingFunction,
            });
            this.resetTokenCollection = await this.chromaClient.getOrCreateCollection({
                name: 'reset_tokens',
                embeddingFunction: this.embeddingFunction,
            });
            this.logger.log('ChromaDB collections initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize ChromaDB collections', error.stack, error.message);
            throw new Error('ChromaDB initialization failed');
        }
    }
    async signup(signupDto) {
        const { name, email, password, role } = signupDto;
        try {
            this.logger.log(`Checking for existing user with email: ${email}`);
            const existingUser = await this.userCollection.get({
                where: { email },
            });
            if (existingUser.ids.length > 0) {
                throw new common_1.ConflictException('Email already exists');
            }
            this.logger.log('Hashing password');
            const hashedPassword = await bcrypt.hash(password, 10);
            this.logger.log('Storing user in ChromaDB');
            const userId = `user_${(0, uuid_1.v4)()}`;
            const userDocument = JSON.stringify({ name, email, role, password: hashedPassword, cv_id: [] });
            await this.userCollection.add({
                ids: [userId],
                documents: [userDocument],
                metadatas: [{ email }],
            });
            this.logger.log(`User stored successfully: ${userId}`);
            this.logger.log('Generating JWT');
            const payload = { sub: userId, email, role };
            const accessToken = this.jwtService.sign(payload);
            return { accessToken };
        }
        catch (error) {
            this.logger.error('Signup failed', error.stack, error.message);
            throw error;
        }
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        try {
            this.logger.log(`Finding user with email: ${email}`);
            const result = await this.userCollection.get({
                where: { email },
            });
            if (result.ids.length === 0) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const userDoc = JSON.parse(result.documents[0]);
            this.logger.log('Verifying password');
            const isPasswordValid = await bcrypt.compare(password, userDoc.password);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            this.logger.log('Generating JWT for login');
            const payload = { sub: result.ids[0], email, role: userDoc.role };
            const accessToken = this.jwtService.sign(payload);
            return { accessToken };
        }
        catch (error) {
            this.logger.error('Login failed', error.stack, error.message);
            throw error;
        }
    }
    async forgotPassword(forgotPasswordDto) {
        const { email } = forgotPasswordDto;
        try {
            this.logger.log(`Checking user with email: ${email}`);
            const result = await this.userCollection.get({
                where: { email },
            });
            if (result.ids.length === 0) {
                throw new common_1.NotFoundException('User not found');
            }
            this.logger.log('Generating reset token');
            const resetToken = (0, uuid_1.v4)();
            const expiresAt = Date.now() + 3600000;
            const tokenDocument = JSON.stringify({ email, resetToken, expiresAt });
            this.logger.log('Storing reset token in ChromaDB');
            await this.resetTokenCollection.add({
                ids: [resetToken],
                documents: [tokenDocument],
                metadatas: [{ email }],
            });
            this.logger.log(`Reset token generated: ${resetToken}`);
            return { resetToken };
        }
        catch (error) {
            this.logger.error('Forgot password failed', error.stack, error.message);
            throw error;
        }
    }
    async resetPassword(resetPasswordDto) {
        const { resetToken, newPassword } = resetPasswordDto;
        try {
            this.logger.log(`Validating reset token: ${resetToken}`);
            const result = await this.resetTokenCollection.get({
                ids: [resetToken],
            });
            if (result.ids.length === 0) {
                throw new common_1.UnauthorizedException('Invalid or expired reset token');
            }
            const tokenDoc = JSON.parse(result.documents[0]);
            if (tokenDoc.expiresAt < Date.now()) {
                await this.resetTokenCollection.delete({ ids: [resetToken] });
                throw new common_1.UnauthorizedException('Reset token expired');
            }
            this.logger.log(`Finding user with email: ${tokenDoc.email}`);
            const userResult = await this.userCollection.get({
                where: { email: tokenDoc.email },
            });
            if (userResult.ids.length === 0) {
                throw new common_1.NotFoundException('User not found');
            }
            this.logger.log('Hashing new password');
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const userDoc = JSON.parse(userResult.documents[0]);
            const updatedUserDoc = JSON.stringify({
                ...userDoc,
                password: hashedPassword,
            });
            this.logger.log('Updating user password in ChromaDB');
            await this.userCollection.update({
                ids: [userResult.ids[0]],
                documents: [updatedUserDoc],
                metadatas: [{ email: tokenDoc.email }],
            });
            this.logger.log('Deleting used reset token');
            await this.resetTokenCollection.delete({ ids: [resetToken] });
            this.logger.log('Password reset successfully');
        }
        catch (error) {
            this.logger.error('Reset password failed', error.stack, error.message);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        chromadb_1.ChromaClient])
], AuthService);
//# sourceMappingURL=auth.service.js.map