"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CvService = void 0;
const common_1 = require("@nestjs/common");
let CvService = class CvService {
    create(createCvDto) {
        return 'This action adds a new cv';
    }
    findAll() {
        return `This action returns all cv`;
    }
    findOne(id) {
        return `This action returns a #${id} cv`;
    }
    update(id, updateCvDto) {
        return `This action updates a #${id} cv`;
    }
    remove(id) {
        return `This action removes a #${id} cv`;
    }
};
exports.CvService = CvService;
exports.CvService = CvService = __decorate([
    (0, common_1.Injectable)()
], CvService);
//# sourceMappingURL=cv.service.js.map