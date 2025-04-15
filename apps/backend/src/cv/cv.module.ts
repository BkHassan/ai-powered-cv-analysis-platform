// C:\Users\Hassan\ai_cv\apps\backend\src\cv\cv.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';

@Module({
  imports: [HttpModule],
  providers: [CvService],
  controllers: [CvController],
  exports: [CvService],
})
export class CvModule {}