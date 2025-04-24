import { ChromaClient } from 'chromadb';
import { UploadCvDto } from './dto/upload-cv';
import { AssignCvDto } from './dto/assign-cv';
export declare class CvService {
    private readonly chromaClient;
    private cvCollection;
    private userCollection;
    private readonly logger;
    private readonly embeddingFunction;
    constructor(chromaClient: ChromaClient);
    private initializeCollections;
    private generateCvId;
    uploadCv(uploadCvDto: UploadCvDto, requesterRole: string): Promise<{
        cvId: string;
    }>;
    assignCv(cvId: string, assignCvDto: AssignCvDto, requesterRole: string): Promise<void>;
    getCv(cvId: string, requesterEmail: string, requesterRole: string): Promise<any>;
}
