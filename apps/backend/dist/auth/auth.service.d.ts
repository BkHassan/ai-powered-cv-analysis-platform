import { JwtService } from '@nestjs/jwt';
import { ChromaService } from './chroma.service';
import { CreateAuthDto, LoginAuthDto } from './dto/create-auth.dto';
export declare class AuthService {
    private chromaService;
    private jwtService;
    constructor(chromaService: ChromaService, jwtService: JwtService);
    signup(createAuthDto: CreateAuthDto): Promise<{
        access_token: string;
    }>;
    login(loginAuthDto: LoginAuthDto): Promise<{
        access_token: string;
    }>;
}
