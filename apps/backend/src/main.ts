import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  const frontendOrigins = process.env.FRONTEND_URL?.split(',').filter(Boolean);
  app.enableCors({
    origin: frontendOrigins?.length ? frontendOrigins : true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  const port = Number(process.env.PORT) || 3003;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
