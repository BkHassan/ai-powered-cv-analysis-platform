import {
  Controller,
  UploadedFile,
  UseInterceptors,
  Post,
  Get,
  Body,
  Param,
  BadRequestException,
  UseGuards,
  Request,
  Logger,
  Res,
} from '@nestjs/common';
import { CvService } from './cv.service';
// import { UploadCvDto } from './dto/upload-cv';
import { ChatCvDto } from './dto/chat-cv.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, Response } from 'express';
import * as fs from 'fs';



@Controller('cv')
@UseGuards(JwtAuthGuard)
export class CvController {
  private readonly logger = new Logger(CvController.name);
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCV(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    this.logger.log(`Received upload request from ${req.user.email}`);
    if (!file) {
      this.logger.error('No file provided in request');
      throw new BadRequestException('No file uploaded');
    }
    if (file.mimetype !== 'application/pdf') {
      this.logger.error(`Invalid file type: ${file.mimetype}`);
      throw new BadRequestException('Only PDF files are accepted');
    }
    const uploaderEmail = req.user.email;
    this.logger.log(
      `Uploading CV for ${uploaderEmail}, file: ${file.originalname}`,
    );
    return this.cvService.uploadCv(uploaderEmail, file);
  }

  @Get(':cvId')
  async getCv(
    @Param('cvId') cvId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    this.logger.log(`Get CV ${cvId} request by ${req.user.email}`);
    const { filePath, fileName } = await this.cvService.getCv(
      cvId,
      req.user.email,
      req.user.role,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listCvs(@Request() req) {
    this.logger.log(`List CVs request by ${req.user.email}`);
    return this.cvService.listCvs(req.user.role, req.user.email);
  }

  @Post(':cvId/chat')
  @UseGuards(JwtAuthGuard)
  async chatCv(
    @Param('cvId') cvId: string,
    @Body() chatCvDto: ChatCvDto,
    @Request() req,
  ) {
    this.logger.log(`Chat CV ${cvId} request by ${req.user.email}`);
    return this.cvService.chatCv(
      cvId,
      chatCvDto,
      req.user.email,
      req.user.role,
    );
  }
}
