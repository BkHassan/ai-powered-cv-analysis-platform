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
let CvController = CvController_1 = class CvController {
    cvService;
    logger = new common_1.Logger(CvController_1.name);
    constructor(cvService) {
        this.cvService = cvService;
    }
    async getCv(cvId, req) {
        this.logger.log(`Get CV ${cvId} request by ${req.user.email}`);
        return this.cvService.getCv(cvId, req.user.email, req.user.role);
    }
    async listCvs(req) {
        this.logger.log(`List CVs request by ${req.user.email}`);
        return this.cvService.listCvs(req.user.role, req.user.email);
    }
    async chatCv(cvId, chatCvDto, req) {
        this.logger.log(`Chat CV ${cvId} request by ${req.user.email}`);
        return this.cvService.chatCv(cvId, chatCvDto, req.user.email, req.user.role);
    }
};
exports.CvController = CvController;
__decorate([
    (0, common_1.Get)(':cvId'),
    __param(0, (0, common_1.Param)('cvId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "getCv", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "listCvs", null);
__decorate([
    (0, common_1.Post)(':cvId/chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('cvId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, chat_cv_dto_1.ChatCvDto, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "chatCv", null);
exports.CvController = CvController = CvController_1 = __decorate([
    (0, common_1.Controller)('cv'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cv_service_1.CvService])
], CvController);
//# sourceMappingURL=cv.controller.js.map