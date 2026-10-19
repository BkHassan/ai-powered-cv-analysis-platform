import { ChromaClient } from 'chromadb';
import { ChatCvDto } from './dto/chat-cv.dto';
import { ConfigService } from '@nestjs/config';
export declare class CvService {
    private readonly chromaClient;
    private readonly configService;
    private cvCollection;
    private userCollection;
    private chatHistoryCollection;
    private readonly logger;
    private readonly embeddingFunction;
    private readonly uploadFolder;
    constructor(chromaClient: ChromaClient, configService: ConfigService);
    private initializeCollections;
    private generateCvId;
    resolveFileNameToCvId(fileName: string, retries?: number, delay?: number): Promise<string>;
    uploadCv(uploaderEmail: string, file: Express.Multer.File, name: string): Promise<{
        cvId: string;
        fileName: string;
    }>;
    private extractTextFromPdf;
    private splitTextIntoChunks;
    getCv(fileName: string, requesterEmail: string, requesterRole: string): Promise<{
        filePath: string;
        fileName: string;
    }>;
    updateCvName(cvId: string, name: string, requesterEmail: string, requesterRole: string): Promise<void>;
    deleteCv(cvId: string, requesterEmail: string, requesterRole: string): Promise<void>;
    listCvs(requesterRole: string, requesterEmail: string): Promise<any[]>;
    chatCv(fileName: string, chatCvDto: ChatCvDto, requesterEmail: string, requesterRole: string): Promise<{
        response: string;
    }>;
    globalChatCv(chatCvDto: ChatCvDto, requesterEmail: string, requesterRole: string): Promise<{
        response: string;
    }>;
    getChatHistory(fileName: string, requesterEmail: string, requesterRole: string): Promise<{
        query: string;
        response: string;
        timestamp: string;
    }[]>;
    getGlobalChatHistory(requesterEmail: string, requesterRole: string): Promise<{
        query: string;
        response: string;
        timestamp: string;
    }[]>;
}
