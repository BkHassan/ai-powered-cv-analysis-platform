"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
function matchesOrigin(pattern, origin) {
    if (!pattern.includes('*')) {
        return pattern === origin;
    }
    const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^.]+');
    return new RegExp(`^${escaped}$`).test(origin);
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe());
    const frontendOrigins = process.env.FRONTEND_URL?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.enableCors({
        origin: frontendOrigins?.length
            ? (origin, callback) => callback(null, !origin ||
                frontendOrigins.some((pattern) => matchesOrigin(pattern, origin)))
            : true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    const port = Number(process.env.PORT) || 3003;
    await app.listen(port, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map