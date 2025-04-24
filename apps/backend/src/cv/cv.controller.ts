import { Controller, Post, Get, Body, Param, ValidationPipe, UseGuards, Request, Logger } from '@nestjs/common';
import { CvService } from './cv.service';
import { UploadCvDto } from './dto/upload-cv';
import { AssignCvDto } from './dto/assign-cv';
import { ChatCvDto } from './dto/chat-cv.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cv')
@UseGuards(JwtAuthGuard)
export class CvController {
  private readonly logger = new Logger(CvController.name);

  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  async uploadCv(@Body(ValidationPipe) uploadCvDto: UploadCvDto, @Request() req): Promise<{ cvId: string }> {
    this.logger.log('Upload cv request by ${req.user.email}');
    return this.cvService.uploadCv(uploadCvDto, req.user.role);
  }

  @Post(':cvId/assign')
  async assignCv(@Param('cvId') cvId: string, @Body(ValidationPipe) assignCvDto: AssignCvDto, @Request() req): Promise<void> {
    this.logger.log(`Assign cv ${cvId} request by ${req.user.email}`);
    return this.cvService.assignCv(cvId, assignCvDto, req.user.role);
  }

  @Get(':cvId')
  async getCv(@Param('cvId') cvId: string, @Request() req): Promise<any> {
    this.logger.log(`Get CV ${cvId} request by ${req.user.email}`);
    return this.cvService.getCv(cvId, req.user.email, req.user.role);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listCvs(@Request() req) {
    this.logger.log(`List CVs request by ${req.user.email}`);
    return this.cvService.listCvs(req.user.role);
  }

  @Post(':cvId/chat')
  @UseGuards(JwtAuthGuard)
  async chatCv(@Param('cvId') cvId: string, @Body() chatCvDto: ChatCvDto, @Request() req) {
    this.logger.log(`Chat CV ${cvId} request by ${req.user.email}`);
    return this.cvService.chatCv(cvId, chatCvDto, req.user.email, req.user.role);
  }
}