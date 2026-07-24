import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';
import { ConfigModule } from '@nestjs/config';
import { QuizModule } from './quiz/quiz.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,      
    }),
    AuthModule, CvModule, QuizModule],
  controllers: [AppController],
})
export class AppModule {}