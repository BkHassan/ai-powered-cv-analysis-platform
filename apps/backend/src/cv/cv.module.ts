import { Module } from '@nestjs/common';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { ChromaClient } from 'chromadb';

@Module({
  controllers: [CvController],
  providers: [
    CvService,
    {
      provide: ChromaClient,
      useFactory: () => new ChromaClient({ path: 'http://chromadb:8000' }),
    },
  ],
})
export class CvModule {}