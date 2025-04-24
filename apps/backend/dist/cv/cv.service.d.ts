import { ChromaClient } from 'chromadb';
import { UploadCvDto } from './dto/upload-cv';
import { AssignCvDto } from './dto/assign-cv';
import { ChatCvDto } from './dto/chat-cv.dto';
import { ConfigService } from '@nestjs/config';
export declare class CvService {
    private readonly chromaClient;
    private readonly configService;
    private cvCollection;
    private userCollection;
    private readonly logger;
    private readonly embeddingFunction;
    constructor(chromaClient: ChromaClient, configService: ConfigService);
    private initializeCollections;
    private generateCvId;
    uploadCv(uploadCvDto: UploadCvDto, requesterRole: string): Promise<{
        cvId: string;
    }>;
    assignCv(cvId: string, assignCvDto: AssignCvDto, requesterRole: string): Promise<void>;
    getCv(cvId: string, requesterEmail: string, requesterRole: string): Promise<any>;
    listCvs(requesterRole: string): Promise<any[]>;
    chatCv(cvId: string, chatCvDto: ChatCvDto, requesterEmail: string, requesterRole: string): Promise<{
        response: string;
    }>;
}
