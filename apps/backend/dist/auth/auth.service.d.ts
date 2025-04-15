import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export declare class AuthService {
    private jwtService;
    private configService;
    private httpService;
    private baseUrl;
    constructor(jwtService: JwtService, configService: ConfigService, httpService: HttpService);
    initUsersCollection(): Promise<any>;
    validateUser(email: string, pass: string): Promise<any>;
    signup(email: string, password: string, role?: string): Promise<{
        access_token: string;
    }>;
    login(user: any): Promise<{
        access_token: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    clearUsers(): Promise<{
        message: string;
    }>;
}
