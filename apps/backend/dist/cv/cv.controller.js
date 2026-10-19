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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CvController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CvController = void 0;
const common_1 = require("@nestjs/common");
const cv_service_1 = require("./cv.service");
const chat_cv_dto_1 = require("./dto/chat-cv.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const fs = require("fs");
let CvController = CvController_1 = class CvController {
    cvService;
    logger = new common_1.Logger(CvController_1.name);
    constructor(cvService) {
        this.cvService = cvService;
    }
    async uploadCV(file, name, req) {
        this.logger.log(`Received upload request from ${req.user.email}`);
        if (!file) {
            this.logger.error('No file provided in request');
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (file.mimetype !== 'application/pdf') {
            this.logger.error(`Invalid file type: ${file.mimetype}`);
            throw new common_1.BadRequestException('Only PDF files are accepted');
        }
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            this.logger.error('No valid name provided in request');
            throw new common_1.BadRequestException('CV name or note is required');
        }
        this.logger.log(`Uploading CV for ${req.user.email}, file: ${file.originalname}, name: ${name}`);
        return this.cvService.uploadCv(req.user.email, file, name);
    }
    async listCvs(req) {
        this.logger.log(`List CVs request by ${req.user.email}`);
        return this.cvService.listCvs(req.user.role, req.user.email);
    }
    async globalChatCv(chatCvDto, req) {
        this.logger.log(`Global chat request by ${req.user.email}`);
        if (!chatCvDto.message) {
            this.logger.warn('Missing message in chatCvDto');
            throw new common_1.BadRequestException('Message is required');
        }
        return this.cvService.globalChatCv(chatCvDto, req.user.email, req.user.role);
    }
    async getGlobalChatHistory(req) {
        const user = req.user;
        this.logger.log(`Global chat history request by ${user.email}`);
        return this.cvService.getGlobalChatHistory(user.email, user.role);
    }
    async chatCv(fileName, chatCvDto, req) {
        this.logger.log(`Chat CV ${fileName} request by ${req.user.email}`);
        if (!chatCvDto.message) {
            this.logger.warn('Missing message in chatCvDto');
            throw new common_1.BadRequestException('Message is required');
        }
        return this.cvService.chatCv(fileName, chatCvDto, req.user.email, req.user.role);
    }
    async getChatHistory(fileName, req) {
        const user = req.user;
        return this.cvService.getChatHistory(fileName, user.email, user.role);
    }
    async getCv(fileName, req, res) {
        this.logger.log(`Get CV ${fileName} request by ${req.user.email}`);
        const { filePath, fileName: resolvedFileName } = await this.cvService.getCv(fileName, req.user.email, req.user.role);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${fileName}"`,
        });
        fs.createReadStream(filePath).pipe(res);
    }
    async deleteCV(cvId, req) {
        this.logger.log(`Received delete request for CV ${cvId} from ${req.user.email}`);
        await this.cvService.deleteCv(cvId, req.user.email, req.user.role);
        return { message: `CV ${cvId} deleted successfully` };
    }
    async updateCVName(cvId, name, req) {
        await this.cvService.updateCvName(cvId, name, req.user.email, req.user.role);
        return { message: 'CV title updated successfully', name: name.trim() };
    }
};
exports.CvController = CvController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('name')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "uploadCV", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "listCvs", null);
__decorate([
    (0, common_1.Post)('global-chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_cv_dto_1.ChatCvDto, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "globalChatCv", null);
__decorate([
    (0, common_1.Get)('global-chat-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "getGlobalChatHistory", null);
__decorate([
    (0, common_1.Post)(':fileName/chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('fileName')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, chat_cv_dto_1.ChatCvDto, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "chatCv", null);
__decorate([
    (0, common_1.Get)(':fileName/chat-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('fileName')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "getChatHistory", null);
__decorate([
    (0, common_1.Get)(':fileName'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('fileName')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "getCv", null);
__decorate([
    (0, common_1.Delete)(':cvId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('cvId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteCV", null);
__decorate([
    (0, common_1.Patch)(':cvId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('cvId')),
    __param(1, (0, common_1.Body)('name')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateCVName", null);
exports.CvController = CvController = CvController_1 = __decorate([
    (0, common_1.Controller)('cv'),
    __metadata("design:paramtypes", [cv_service_1.CvService])
], CvController);
//# sourceMappingURL=cv.controller.js.map