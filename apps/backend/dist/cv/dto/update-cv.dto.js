"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCvDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_cv_dto_1 = require("./create-cv.dto");
class UpdateCvDto extends (0, mapped_types_1.PartialType)(create_cv_dto_1.CreateCvDto) {
}
exports.UpdateCvDto = UpdateCvDto;
//# sourceMappingURL=update-cv.dto.js.map