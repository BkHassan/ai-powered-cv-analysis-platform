import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Entries may use "*" as a single-label wildcard, so rotating preview
// deployments can be allowed without redeploying the API.
function matchesOrigin(pattern: string, origin: string): boolean {
  if (!pattern.includes('*')) {
    return pattern === origin;
  }
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^.]+');
  return new RegExp(`^${escaped}$`).test(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  const frontendOrigins = process.env.FRONTEND_URL?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: frontendOrigins?.length
      ? (origin, callback) =>
          callback(
            null,
            !origin ||
              frontendOrigins.some((pattern) => matchesOrigin(pattern, origin)),
          )
      : true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  const port = Number(process.env.PORT) || 3003;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
