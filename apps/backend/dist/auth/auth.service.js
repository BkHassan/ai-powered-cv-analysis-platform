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
let AuthService = AuthService_1 = class AuthService {
    jwtService;
    chromaClient;
    collection;
    logger = new common_1.Logger(AuthService_1.name);
    embeddingFunction = new chromadb_1.DefaultEmbeddingFunction();
    constructor(jwtService, chromaClient) {
        this.jwtService = jwtService;
        this.chromaClient = chromaClient;
        this.chromaClient = new chromadb_1.ChromaClient({ path: 'http://chromadb:8000' });
        this.initializeCollection();
    }
    async initializeCollection() {
        try {
            this.collection = await this.chromaClient.getOrCreateCollection({
                name: 'users',
                embeddingFunction: this.embeddingFunction,
            });
            this.logger.log('ChromaDB collection initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize ChromaDB collection', error);
            throw new Error('ChromaDB initialization failed');
        }
    }
    async signup(signupDto) {
        const { name, email, password, role } = signupDto;
        try {
            const existingUser = await this.collection.get({
                where: { email },
            });
            if (existingUser.ids.length > 0) {
                throw new common_1.ConflictException('Email already exists');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = `user_${Date.now()}`;
            await this.collection.add({
                ids: [userId],
                documents: [JSON.stringify({ email, name, role, password: hashedPassword, cv_id: [] })],
                metadatas: [{ email }],
            });
            const payload = { sub: userId, email, role };
            const accessToken = this.jwtService.sign(payload);
            return { accessToken };
        }
        catch (error) {
            this.logger.error('Signup failed', error);
            throw error;
        }
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        try {
            const result = await this.collection.get({
                where: { email },
            });
            if (result.ids.length === 0) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const userDoc = JSON.parse(result.documents[0]);
            const isPasswordValid = await bcrypt.compare(password, userDoc.password);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const payload = { sub: result.ids[0], email, role: userDoc.role };
            const accessToken = this.jwtService.sign(payload);
            return { accessToken };
        }
        catch (error) {
            this.logger.error('Login failed', error);
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