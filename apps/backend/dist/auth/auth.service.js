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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const chromadb = require("chromadb");
const chromadb_1 = require("chromadb");
let AuthService = class AuthService {
    client;
    collection;
    logger = new common_1.Logger('AuthService');
    defaultEF;
    constructor() {
        this.client = new chromadb.ChromaClient({ path: 'http://localhost:8000' });
        this.defaultEF = new chromadb_1.DefaultEmbeddingFunction();
    }
    async onModuleInit() {
        try {
            this.collection = await this.client.getOrCreateCollection({
                name: 'users',
                embeddingFunction: this.defaultEF,
            });
            this.logger.log('chromaDB collection initialized');
        }
        catch (error) {
            this.logger.error('failed to initialized ChromaDB collection', error);
            throw new common_1.HttpException('ChromaDB initialized failed', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    create(createAuthDto) {
        return 'This action adds a new auth';
    }
    findAll() {
        return `This action returns all auth`;
    }
    findOne(id) {
        return `This action returns a #${id} auth`;
    }
    update(id, updateAuthDto) {
        return `This action updates a #${id} auth`;
    }
    remove(id) {
        return `This action removes a #${id} auth`;
    }
    async signup(createAuthDto) {
        try {
            const { email, password, role } = createAuthDto;
            const userId = email.toLowerCase();
            const existingUser = await this.collection.get({
                where: { email: userId },
            });
            if (existingUser.ids.length > 0) {
                throw new common_1.HttpException('Email already exists', common_1.HttpStatus.CONFLICT);
            }
            await this.collection.add({
                ids: [userId, `${userId}-role`],
                documents: [JSON.stringify({ email, password, role })],
                metadatas: [{ email: userId, role }],
            });
            return { message: 'User created successfully' };
        }
        catch (error) {
            this.logger.error('Signup failed', error);
            throw error instanceof common_1.HttpException ? error : new common_1.HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async login(email, password) {
        try {
            const userId = email.toLowerCase();
            const result = await this.collection.get({
                where: { email: userId },
            });
            if (result.ids.length == 0) {
                throw new common_1.HttpException('Invalid credentials', common_1.HttpStatus.UNAUTHORIZED);
            }
            const user = JSON.parse(result.documents[0] ?? 'null');
            if (user.password !== password) {
                throw new common_1.HttpException('Invalid credential', common_1.HttpStatus.UNAUTHORIZED);
            }
            return { message: 'Login successful', user: { email: user.email, role: user.role } };
        }
        catch (error) {
            this.logger.error('Login failed', error);
            throw error instanceof common_1.HttpException ? error : new common_1.HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AuthService);
//# sourceMappingURL=auth.service.js.map