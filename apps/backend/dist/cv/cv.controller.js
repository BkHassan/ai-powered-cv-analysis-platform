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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CvController = void 0;
const common_1 = require("@nestjs/common");
const cv_service_1 = require("./cv.service");
const upload_cv_1 = require("./dto/upload-cv");
const assign_cv_1 = require("./dto/assign-cv");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let CvController = class CvController {
    cvService;
    constructor(cvService) {
        this.cvService = cvService;
    }
    async uploadCv(uploadCvDto, req) {
        return this.cvService.uploadCv(uploadCvDto, req.user.role);
    }
    async assignCv(cvId, assignCvDto, req) {
        return this.cvService.assignCv(cvId, assignCvDto, req.user.role);
    }
    async getCv(cvId, req) {
        return this.cvService.getCv(cvId, req.user.email, req.user.role);
    }
    async debugCvs(req) {
        if (req.user.role !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can debug CVs');
        }
        return this.cvService.debugCvs();
    }
    async healthCheck(req) {
        if (req.user.role !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can check health');
        }
        return this.cvService.healthCheck();
    }
};
exports.CvController = CvController;
__decorate([
    (0, common_1.Post)('upload'),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [upload_cv_1.UploadCvDto, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "uploadCv", null);
__decorate([
    (0, common_1.Post)(':cvId/assign'),
    __param(0, (0, common_1.Param)('cvId')),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_cv_1.AssignCvDto, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "assignCv", null);
__decorate([
    (0, common_1.Get)(':cvId'),
    __param(0, (0, common_1.Param)('cvId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "getCv", null);
__decorate([
    (0, common_1.Get)('debug-cvs'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "debugCvs", null);
__decorate([
    (0, common_1.Get)('health'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "healthCheck", null);
exports.CvController = CvController = __decorate([
    (0, common_1.Controller)('cv'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cv_service_1.CvService])
], CvController);
//# sourceMappingURL=cv.controller.js.map