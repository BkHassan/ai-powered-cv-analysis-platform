import { ChromaClient } from 'chromadb';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
export declare class AuthService {
    private readonly jwtService;
    private readonly chromaClient;
    private userCollection;
    private resetTokenCollection;
    private readonly logger;
    private readonly embeddingFunction;
    constructor(jwtService: JwtService, chromaClient: ChromaClient);
    private initializeCollections;
    signup(signupDto: SignupDto): Promise<{
        accessToken: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        resetToken: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void>;
}
