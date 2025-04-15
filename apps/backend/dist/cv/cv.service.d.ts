import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export declare class CvService {
    private configService;
    private httpService;
    private baseUrl;
    constructor(configService: ConfigService, httpService: HttpService);
    initCollection(): Promise<any>;
    uploadCv(cv: {
        id: string;
        name: string;
        email: string;
        skills: string[];
    }, user: any): Promise<{
        name: string;
        email: string;
        skills: string[];
        id: string;
    }>;
    assignCv(cvId: string, userId: string, user: any): Promise<{
        message: string;
    }>;
}
