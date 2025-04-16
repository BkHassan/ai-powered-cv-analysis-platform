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
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const bcrypt = require("bcryptjs");
let AuthService = class AuthService {
    jwtService;
    configService;
    httpService;
    baseUrl;
    constructor(jwtService, configService, httpService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.httpService = httpService;
        const host = this.configService.get('CHROMADB_HOST', 'chromadb');
        const port = this.configService.get('CHROMADB_PORT', '8000');
        const secret = this.configService.get('JWT_SECRET', 'my-secret-key');
        console.log('JWT_SECRET:', secret);
        console.log('ChromaDB:', `http://${host}:${port}`);
        this.baseUrl = `http://${host}:${port}/api/v2`;
        this.initUsersCollection().catch(err => console.error('Init users collection error:', err.message));
    }
    async initUsersCollection() {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/collections`));
            const collections = response.data;
            if (collections.some(c => c.name === 'users')) {
                console.log('Users collection exists');
                return;
            }
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/collections`, { name: 'users' }));
            console.log('Users collection created');
        }
        catch (error) {
            console.error('Failed to initialize users collection:', error.message);
            throw new common_1.InternalServerErrorException(`Failed to connect to users database: ${error.message}`);
        }
    }
    async validateUser(email, pass) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/collections/users/get`));
            const users = response.data;
            const user = users.metadatas?.find(u => u.email === email);
            if (user && await bcrypt.compare(pass, user.password)) {
                return { id: users.ids[users.metadatas.indexOf(user)], email, role: user.role || 'user' };
            }
            return null;
        }
        catch (error) {
            console.error('Validate user error:', error.response ? error.response.data : error.message);
            throw new common_1.InternalServerErrorException(`Failed to validate user: ${error.message}`);
        }
    }
    async signup(email, password, role = 'user') {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/collections/users/get`));
            const users = response.data;
            const existing = users.metadatas?.find(u => u.email === email);
            if (existing) {
                throw new common_1.ForbiddenException('Email already exists');
            }
            const id = `user_${Date.now()}`;
            const hashedPassword = await bcrypt.hash(password, 10);
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/collections/users/add`, {
                documents: [`User ${email}`],
                metadatas: [{ email, password: hashedPassword, role }],
                ids: [id],
            }));
            return this.login({ id, email, role });
        }
        catch (error) {
            console.error('Signup error:', error.message);
            if (error instanceof common_1.ForbiddenException)
                throw error;
            throw new common_1.InternalServerErrorException(`Failed to sign up user: ${error.message}`);
        }
    }
    async login(user) {
        try {
            const payload = { email: user.email, sub: user.id, role: user.role };
            return {
                access_token: this.jwtService.sign(payload),
            };
        }
        catch (error) {
            console.error('Token generation error:', error.message);
            throw new common_1.InternalServerErrorException('Failed to generate token');
        }
    }
    async forgotPassword(email) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/collections/users/get`));
            const users = response.data;
            const user = users.metadatas?.find(u => u.email === email);
            if (!user) {
                throw new common_1.ForbiddenException('User not found');
            }
            const resetToken = this.jwtService.sign({ sub: users.ids[users.metadatas.indexOf(user)], email }, { expiresIn: '15m' });
            console.log(`Reset token for ${email}: ${resetToken}`);
            return { message: 'Reset token generated—check console' };
        }
        catch (error) {
            console.error('Forgot password error:', error.message);
            if (error instanceof common_1.ForbiddenException)
                throw error;
            throw new common_1.InternalServerErrorException('Failed to process password reset');
        }
    }
    async clearUsers() {
        try {
            await (0, rxjs_1.firstValueFrom)(this.httpService.delete(`${this.baseUrl}/collections/users`));
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/collections`, { name: 'users' }));
            return { message: 'Users cleared' };
        }
        catch (error) {
            console.error('Clear users error:', error.message);
            throw new common_1.InternalServerErrorException('Failed to clear users');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        axios_1.HttpService])
], AuthService);
//# sourceMappingURL=auth.service.js.map