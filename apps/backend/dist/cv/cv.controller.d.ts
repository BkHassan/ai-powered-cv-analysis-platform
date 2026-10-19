import { CvService } from './cv.service';
import { ChatCvDto } from './dto/chat-cv.dto';
import { Response } from 'express';
export declare class CvController {
    private readonly cvService;
    private readonly logger;
    constructor(cvService: CvService);
    uploadCV(file: Express.Multer.File, name: string, req: any): Promise<{
        cvId: string;
        fileName: string;
    }>;
    listCvs(req: any): Promise<any[]>;
    globalChatCv(chatCvDto: ChatCvDto, req: any): Promise<{
        response: string;
    }>;
    getGlobalChatHistory(req: any): Promise<{
        query: string;
        response: string;
        timestamp: string;
    }[]>;
    chatCv(fileName: string, chatCvDto: ChatCvDto, req: any): Promise<{
        response: string;
    }>;
    getChatHistory(fileName: string, req: any): Promise<{
        query: string;
        response: string;
        timestamp: string;
    }[]>;
    getCv(fileName: string, req: any, res: Response): Promise<void>;
    deleteCV(cvId: string, req: any): Promise<{
        message: string;
    }>;
    updateCVName(cvId: string, name: string, req: any): Promise<{
        message: string;
        name: string;
    }>;
}
