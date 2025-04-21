import { AuthService } from './auth.service';
import { CreateAuthDto, LoginAuthDto } from './dto/create-auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    signup(createAuthDto: CreateAuthDto): Promise<{
        access_token: string;
    }>;
    login(loginAuthDto: LoginAuthDto): Promise<{
        access_token: string;
    }>;
}
