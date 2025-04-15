import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
export declare class AuthController {
    private authService;
    private configService;
    constructor(authService: AuthService, configService: ConfigService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
    }>;
    signup(body: {
        email: string;
        password: string;
        role?: string;
    }): Promise<{
        access_token: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    clearUsers(): Promise<{
        message: string;
    }>;
    getConfig(): {
        jwtSecret: string;
    };
}
