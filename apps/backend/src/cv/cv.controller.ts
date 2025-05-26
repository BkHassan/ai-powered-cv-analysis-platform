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
  Req,
  Logger,
  Res,
  Delete,
} from '@nestjs/common';
import { CvService } from './cv.service';
// import { UploadCvDto } from './dto/upload-cv';
import { ChatCvDto } from './dto/chat-cv.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, Response } from 'express';
import * as fs from 'fs';

@Controller('cv')
export class CvController {
  private readonly logger = new Logger(CvController.name);
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCV(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Req() req,
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
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      this.logger.error('No valid name provided in request');
      throw new BadRequestException('CV name or note is required');
    }
    this.logger.log(
      `Uploading CV for ${req.user.email}, file: ${file.originalname}, name: ${name}`,
    );
    return this.cvService.uploadCv(req.user.email, file, name);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listCvs(@Req() req) {
    this.logger.log(`List CVs request by ${req.user.email}`);
    return this.cvService.listCvs(req.user.role, req.user.email);
  }

  @Post('global-chat')
  @UseGuards(JwtAuthGuard)
  async globalChatCv(@Body() chatCvDto: ChatCvDto, @Req() req) {
    this.logger.log(`Global chat request by ${req.user.email}`);
    if (!chatCvDto.message) {
      this.logger.warn('Missing message in chatCvDto');
      throw new BadRequestException('Message is required');
    }
    return this.cvService.globalChatCv(
      chatCvDto,
      req.user.email,
      req.user.role,
    );
  }

  @Get('global-chat-history')
  @UseGuards(JwtAuthGuard)
  async getGlobalChatHistory(@Req() req: any) {
    const user = req.user as { email: string; role: string };
    this.logger.log(`Global chat history request by ${user.email}`);
    return this.cvService.getGlobalChatHistory(user.email, user.role);
  }

  @Post(':fileName/chat')
  @UseGuards(JwtAuthGuard)
  async chatCv(
    @Param('fileName') fileName: string,
    @Body() chatCvDto: ChatCvDto,
    @Req() req,
  ) {
    this.logger.log(`Chat CV ${fileName} request by ${req.user.email}`);
    if (!chatCvDto.message) {
      this.logger.warn('Missing message in chatCvDto');
      throw new BadRequestException('Message is required');
    }
    return this.cvService.chatCv(
      fileName,
      chatCvDto,
      req.user.email,
      req.user.role,
    );
  }

  @Get(':fileName/chat-history')
  @UseGuards(JwtAuthGuard)
  async getChatHistory(@Param('fileName') fileName: string, @Req() req: any) {
    const user = req.user as { email: string; role: string };
    return this.cvService.getChatHistory(fileName, user.email, user.role);
  }

  @Get(':fileName')
  @UseGuards(JwtAuthGuard)
  async getCv(
    @Param('fileName') fileName: string,
    @Req() req,
    @Res() res: Response,
  ) {
    this.logger.log(`Get CV ${fileName} request by ${req.user.email}`);
    const { filePath, fileName: resolvedFileName } = await this.cvService.getCv(
      fileName,
      req.user.email,
      req.user.role,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }

  @Delete(':cvId')
  @UseGuards(JwtAuthGuard)
  async deleteCV(@Param('cvId') cvId: string, @Req() req: any) {
    this.logger.log(
      `Received delete request for CV ${cvId} from ${req.user.email}`,
    );
    await this.cvService.deleteCv(cvId);
    return { message: `CV ${cvId} deleted successfully` };
  }
}
