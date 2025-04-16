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
exports.CvService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let CvService = class CvService {
    configService;
    httpService;
    baseUrl;
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        const host = this.configService.get('CHROMADB_HOST', 'chromadb');
        const port = this.configService.get('CHROMADB_PORT', '8000');
        this.baseUrl = `http://${host}:${port}/api/v2`;
        console.log('ChromaDB URL:', this.baseUrl);
        this.initCollection().catch(err => console.error('Init CV collection error:', err.message));
    }
    async initCollection() {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/collections`));
            const collections = response.data;
            if (collections.some(c => c.name === 'cv')) {
                console.log('CV collection exists');
                return;
            }
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/collections`, { name: 'cv' }));
            console.log('CV collection created');
        }
        catch (error) {
            console.error('Failed to initialize cvCollection:', error.message);
            throw new common_1.InternalServerErrorException(`Failed to connect to CV database: ${error.message}`);
        }
    }
    async uploadCv(cv, user) {
        try {
            const id = `cv_${Date.now()}`;
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/collections/cv/add`, {
                documents: [JSON.stringify(cv)],
                metadatas: [{
                        name: cv.name,
                        email: cv.email,
                        skills: cv.skills,
                        createdAt: new Date().toISOString(),
                        ownerId: user.sub,
                    }],
                ids: [id],
            }));
            const { id: _, ...cvWithoutId } = cv;
            return { id, ...cvWithoutId };
        }
        catch (error) {
            console.error('Upload CV error:', error.message);
            throw new common_1.InternalServerErrorException('Failed to upload CV');
        }
    }
    async assignCv(cvId, userId, user) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/collections/cv/get`, { params: { ids: [cvId] } }));
            const cv = response.data;
            if (!cv.documents.length) {
                throw new common_1.InternalServerErrorException('CV not found');
            }
            const metadata = cv.metadatas[0];
            metadata.assignedTo = userId;
            metadata.assignedAt = new Date().toISOString();
            metadata.assignedBy = user.sub;
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/collections/cv/update`, {
                ids: [cvId],
                metadatas: [metadata],
            }));
            return { message: 'CV assigned successfully' };
        }
        catch (error) {
            console.error('Assign CV error:', error.message);
            throw new common_1.InternalServerErrorException('Failed to assign CV');
        }
    }
};
exports.CvService = CvService;
exports.CvService = CvService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], CvService);
//# sourceMappingURL=cv.service.js.map