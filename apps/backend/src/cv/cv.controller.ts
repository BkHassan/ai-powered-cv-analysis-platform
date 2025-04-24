import { Controller, Post, Get, Body, Param, ValidationPipe, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { CvService } from './cv.service';
import { UploadCvDto } from './dto/upload-cv';
import { AssignCvDto } from './dto/assign-cv';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cv')
@UseGuards(JwtAuthGuard)
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  async uploadCv(@Body(ValidationPipe) uploadCvDto: UploadCvDto, @Request() req): Promise<{ cvId: string }> {
    return this.cvService.uploadCv(uploadCvDto, req.user.role);
  }

  @Post(':cvId/assign')
  async assignCv(@Param('cvId') cvId: string, @Body(ValidationPipe) assignCvDto: AssignCvDto, @Request() req): Promise<void> {
    return this.cvService.assignCv(cvId, assignCvDto, req.user.role);
  }

  @Get(':cvId')
  async getCv(@Param('cvId') cvId: string, @Request() req): Promise<any> {
    return this.cvService.getCv(cvId, req.user.email, req.user.role);
  }
}