import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: ChromaClient,
      useFactory: (configService: ConfigService) =>
         new ChromaClient({ path: configService.get<string>('CHROMADB_URL')}),
      inject: [ConfigService],
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}