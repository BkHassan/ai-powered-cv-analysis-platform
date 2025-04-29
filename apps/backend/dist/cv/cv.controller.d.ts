import { CvService } from './cv.service';
import { ChatCvDto } from './dto/chat-cv.dto';
import { Express } from 'express';
export declare class CvController {
    private readonly cvService;
    private readonly logger;
    constructor(cvService: CvService);
    uploadCV(file: Express.Multer.File, req: any): Promise<{
        cvId: string;
    }>;
    getCv(cvId: string, req: any): Promise<any>;
    listCvs(req: any): Promise<any[]>;
    chatCv(cvId: string, chatCvDto: ChatCvDto, req: any): Promise<{
        response: string;
    }>;
}
