import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ChromaClient } from 'chromadb';


@Module({
  imports: [
    JwtModule.register({
      secret: 'your_jwt_secret_key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: ChromaClient,
      useFactory: () => new ChromaClient({ path: 'http://chromadb:8000' }),
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}