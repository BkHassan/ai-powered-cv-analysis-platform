import { CvService } from './cv.service';
import { UploadCvDto } from './dto/upload-cv';
import { AssignCvDto } from './dto/assign-cv';
export declare class CvController {
    private readonly cvService;
    constructor(cvService: CvService);
    uploadCv(uploadCvDto: UploadCvDto, req: any): Promise<{
        cvId: string;
    }>;
    assignCv(cvId: string, assignCvDto: AssignCvDto, req: any): Promise<void>;
    getCv(cvId: string, req: any): Promise<any>;
    debugCvs(req: any): Promise<any>;
    healthCheck(req: any): Promise<any>;
}
