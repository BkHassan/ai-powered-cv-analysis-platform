import { Module } from '@nestjs/common';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';
// import { QuizService } from './quiz.service';
// import { QuizController } from './quiz.controller';

@Module({
  controllers: [CvController],
  providers: [
    CvService,
    {
      provide: ChromaClient,
      useFactory: (configService: ConfigService) =>
        new ChromaClient({ path: configService.get<string>('CHROMADB_URL') }),
      inject: [ConfigService],
    },
  ],
  exports: [CvService],
})
export class CvModule {}
