import { ChromaClient } from 'chromadb';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly jwtService;
    private readonly chromaClient;
    private collection;
    private readonly logger;
    private readonly embeddingFunction;
    constructor(jwtService: JwtService, chromaClient: ChromaClient);
    private initializeCollection;
    signup(signupDto: SignupDto): Promise<{
        accessToken: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
    }>;
}
