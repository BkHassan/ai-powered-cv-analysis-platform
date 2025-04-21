import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class ChromaService implements OnModuleInit {
    private configService;
    private client;
    private collection;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    createUser(user: {
        id: string;
        email: string;
        password: string;
        role: string;
    }): Promise<void>;
    findUserByEmail(email: string): Promise<any>;
}
