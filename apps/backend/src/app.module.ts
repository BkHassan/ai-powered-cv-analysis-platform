import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,      
    }),
    AuthModule, CvModule],
})
export class AppModule {}