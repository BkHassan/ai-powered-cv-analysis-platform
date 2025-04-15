import { CvService } from './cv.service';
export declare class CvController {
    private cvService;
    constructor(cvService: CvService);
    uploadCv(cv: {
        id: string;
        name: string;
        email: string;
        skills: string[];
    }, req: any): Promise<{
        name: string;
        email: string;
        skills: string[];
        id: string;
    }>;
    assignCv(cvId: string, userId: string, req: any): Promise<{
        message: string;
    }>;
}
