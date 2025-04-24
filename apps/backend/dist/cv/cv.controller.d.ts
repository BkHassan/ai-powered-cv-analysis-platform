import { CvService } from './cv.service';
import { UploadCvDto } from './dto/upload-cv';
import { AssignCvDto } from './dto/assign-cv';
import { ChatCvDto } from './dto/chat-cv.dto';
export declare class CvController {
    private readonly cvService;
    private readonly logger;
    constructor(cvService: CvService);
    uploadCv(uploadCvDto: UploadCvDto, req: any): Promise<{
        cvId: string;
    }>;
    assignCv(cvId: string, assignCvDto: AssignCvDto, req: any): Promise<void>;
    getCv(cvId: string, req: any): Promise<any>;
    listCvs(req: any): Promise<any[]>;
    chatCv(cvId: string, chatCvDto: ChatCvDto, req: any): Promise<{
        response: string;
    }>;
}
