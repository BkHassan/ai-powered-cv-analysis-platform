import { ChromaClient } from 'chromadb';
import { ChatCvDto } from './dto/chat-cv.dto';
import { ConfigService } from '@nestjs/config';
import { Express } from 'express';
export declare class CvService {
    private readonly chromaClient;
    private readonly configService;
    private cvCollection;
    private userCollection;
    private readonly logger;
    private readonly embeddingFunction;
    private readonly uploadFolder;
    constructor(chromaClient: ChromaClient, configService: ConfigService);
    private initializeCollections;
    private generateCvId;
    uploadCv(uploaderEmail: string, file: Express.Multer.File): Promise<{
        cvId: string;
    }>;
    getCv(cvId: string, requesterEmail: string, requesterRole: string): Promise<any>;
    listCvs(requesterRole: string, requesterEmail: string): Promise<any[]>;
    chatCv(cvId: string, chatCvDto: ChatCvDto, requesterEmail: string, requesterRole: string): Promise<{
        response: string;
    }>;
}
