import { CvService } from './cv.service';
import { ChatCvDto } from './dto/chat-cv.dto';
export declare class CvController {
    private readonly cvService;
    private readonly logger;
    constructor(cvService: CvService);
    getCv(cvId: string, req: any): Promise<any>;
    listCvs(req: any): Promise<any[]>;
    chatCv(cvId: string, chatCvDto: ChatCvDto, req: any): Promise<{
        response: string;
    }>;
}
