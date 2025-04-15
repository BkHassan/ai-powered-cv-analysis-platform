import { Controller, Post, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { CvService } from './cv.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('cv')
export class CvController {
  constructor(private cvService: CvService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async uploadCv(
    @Body() cv: { id: string; name: string; email: string; skills: string[] },
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can upload CVs');
    }
    return this.cvService.uploadCv(cv, req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/assign')
  async assignCv(
    @Param('id') cvId: string,
    @Body('userId') userId: string,
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can assign CVs');
    }
    return this.cvService.assignCv(cvId, userId, req.user);
  }
}