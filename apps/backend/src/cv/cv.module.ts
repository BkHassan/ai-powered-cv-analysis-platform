import { Module } from '@nestjs/common';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';

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
})
export class CvModule {}