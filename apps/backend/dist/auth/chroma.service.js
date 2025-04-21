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
exports.ChromaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const chromadb_1 = require("chromadb");
let ChromaService = class ChromaService {
    configService;
    client;
    collection = null;
    constructor(configService) {
        this.configService = configService;
        const chromaUrl = this.configService.get('CHROMADB_URL', 'http://localhost:8000');
        const authToken = this.configService.get('CHROMADB_AUTH_TOKEN', '');
        console.log('ChromaService initialized with URL:', chromaUrl);
        this.client = new chromadb_1.ChromaClient({
            path: chromaUrl,
            auth: authToken ? { provider: 'token', credentials: authToken } : undefined,
        });
    }
    async onModuleInit() {
        try {
            const heartbeat = await this.client.heartbeat();
            console.log('ChromaDB Heartbeat:', heartbeat);
            this.collection = await this.client.getOrCreateCollection({
                name: 'users',
            });
            console.log('Users collection initialized');
        }
        catch (error) {
            console.error('Error initializing ChromaDB:', error.message);
        }
    }
    async createUser(user) {
        if (!this.collection)
            throw new Error('Collection not initialized');
        try {
            await this.collection.add({
                documents: [JSON.stringify(user)],
                ids: [user.id],
                metadatas: [{ email: user.email }],
            });
            console.log('User created in ChromaDB:', user.email);
        }
        catch (error) {
            throw new Error(`Failed to create user in ChromaDB: ${error.message}`);
        }
    }
    async findUserByEmail(email) {
        if (!this.collection)
            throw new Error('Collection not initialized');
        try {
            const results = await this.collection.get({
                where: { email },
            });
            const document = results.documents[0];
            console.log('User fetch result:', document ? 'Found' : 'Not found', email);
            return document && typeof document === 'string' ? JSON.parse(document) : null;
        }
        catch (error) {
            throw new Error(`Failed to fetch user from ChromaDB: ${error.message}`);
        }
    }
};
exports.ChromaService = ChromaService;
exports.ChromaService = ChromaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ChromaService);
//# sourceMappingURL=chroma.service.js.map