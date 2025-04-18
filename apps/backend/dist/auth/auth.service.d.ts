import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
export declare class AuthService {
    private client;
    private collection;
    private logger;
    private defaultEF;
    constructor();
    onModuleInit(): Promise<void>;
    create(createAuthDto: CreateAuthDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateAuthDto: UpdateAuthDto): string;
    remove(id: number): string;
    signup(createAuthDto: CreateAuthDto): Promise<{
        message: string;
    }>;
    login(email: string, password: string): Promise<{
        message: string;
        user: {
            email: any;
            role: any;
        };
    }>;
}
