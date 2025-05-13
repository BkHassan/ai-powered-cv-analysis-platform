import { Module } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { CvModule } from '../cv/cv.module';

@Module({
  imports: [CvModule],
  controllers: [QuizController],
  providers: [
    QuizService,
    {
      provide: ChromaClient,
      useFactory: (configService: ConfigService) =>
        new ChromaClient({ path: configService.get<string>('CHROMADB_URL') }),
      inject: [ConfigService],
    },
  ],
})
export class QuizModule {}
