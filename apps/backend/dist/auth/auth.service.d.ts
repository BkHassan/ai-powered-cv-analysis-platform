import { OnModuleInit } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.services';
export declare class AuthService implements OnModuleInit {
    private readonly jwtService;
    private readonly chromaClient;
    private readonly configService;
    private readonly emailService;
    private userCollection;
    private resetTokenCollection;
    private otpTokenCollection;
    private readonly logger;
    private readonly embeddingFunction;
    constructor(jwtService: JwtService, chromaClient: ChromaClient, configService: ConfigService, emailService: EmailService);
    private initializeCollections;
    onModuleInit(): Promise<void>;
    private bootstrapCollections;
    private generateOTP;
    private ensureAdminUser;
    signup(signupDto: SignupDto): Promise<{
        accessToken: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
    }>;
    verifyOtp(dto: {
        email: string;
        otp: string;
    }): Promise<void>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void>;
    deleteUserByEmail(email: string, requesterRole: string): Promise<void>;
    getAllUsers(requesterRole: string): Promise<any[]>;
    updateUserRole(email: string, newRole: 'user' | 'admin', requesterEmail: string, requesterRole: string): Promise<void>;
    updateUserTier(email: string, tier: 'Free' | 'Premium', requesterRole: string): Promise<void>;
    private inferCreatedDate;
}
