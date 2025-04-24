import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';

@Module({
  imports: [AuthModule, CvModule],
})
export class AppModule {}