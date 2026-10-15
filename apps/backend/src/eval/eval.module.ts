import { Module } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';
import { EvalController } from './eval.controller';
import { EvalService } from './eval.service';

@Module({
  controllers: [EvalController],
  providers: [
    EvalService,
    {
      provide: ChromaClient,
      useFactory: (configService: ConfigService) =>
        new ChromaClient({
          path:
            configService.get<string>('CHROMADB_URL') ||
            'http://chromadb:8000',
        }),
      inject: [ConfigService],
    },
  ],
})
export class EvalModule {}
