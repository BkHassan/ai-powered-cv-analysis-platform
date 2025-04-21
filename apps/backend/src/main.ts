import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  console.log('Starting NestJS application...');
  try {
    const app = await NestFactory.create(AppModule);
    console.log('AppModule loaded successfully');
    const configService = app.get(ConfigService);
    const envVars = {
      NODE_ENV: configService.get('NODE_ENV', 'development'),
      PORT: configService.get('PORT', '3003'),
      JWT_SECRET: configService.get('JWT_SECRET', 'default_jwt_secret'),
      CHROMADB_URL: configService.get('CHROMADB_URL', 'http://localhost:8000'),
      CHROMADB_AUTH_TOKEN: configService.get('CHROMADB_AUTH_TOKEN', ''),
    };
    console.log('Environment variables:', envVars);
    const port = parseInt(envVars.PORT, 10) || 3003;
    app.getHttpAdapter().get('/health', (req, res) => res.status(200).send('OK'));
    await app.listen(port);
    console.log(`Server running on port ${port}`);
  } catch (error) {
    console.error('Failed to start server:', error.message, error.stack);
    process.exit(1);
  }
}
bootstrap();