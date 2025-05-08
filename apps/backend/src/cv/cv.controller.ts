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
    const name = req.body.name;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      this.logger.error('No valid name provided in request');
      throw new BadRequestException('CV name or note is required');
    }
    this.logger.log(
      `Uploading CV for ${uploaderEmail}, file: ${file.originalname}, name: ${name}`,
    );
    return this.cvService.uploadCv(uploaderEmail, file, name);
  }

  @Get(':fileName')
  async getCv(
    @Param('fileName') fileName: string,
    @Request() req,
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
  async deleteCV(@Param('cvId') cvId: string, @Request() req: any) {
    this.logger.log(
      `Received delete request for CV ${cvId} from ${req.user.email}`,
    );
    await this.cvService.deleteCv(cvId);
    return { message: `CV ${cvId} deleted successfully` };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listCvs(@Request() req) {
    this.logger.log(`List CVs request by ${req.user.email}`);
    return this.cvService.listCvs(req.user.role, req.user.email);
  }

  @Post(':fileName/chat')
  @UseGuards(JwtAuthGuard)
  async chatCv(
    @Param('fileName') fileName: string,
    @Body() chatCvDto: ChatCvDto,
    @Request() req,
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
  async getChatHistory(
    @Param('fileName') fileName: string,
    @Request() req: any,
  ) {
    const user = req.user as { email: string; role: string };
    return this.cvService.getChatHistory(fileName, user.email, user.role);
  }

  @Get(':fileName/skills')
  async getCvSkills(@Param('fileName') fileName: string) {
    this.logger.log(`Get CV skills for ${fileName}`);
    return this.cvService.getCvSkills(fileName);
  }
}

@Controller('quiz')
export class QuizController {
  private readonly logger = new Logger(QuizController.name);
  constructor(private readonly cvService: CvService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateQuiz(@Body() body: { fileName: string }, @Request() req: any) {
    this.logger.log(`Generate quiz for ${body.fileName} by ${req.user.email}`);
    if (!body.fileName) {
      this.logger.warn('Missing fileName in request body');
      throw new BadRequestException('fileName is required');
    }
    return this.cvService.generateQuiz(
      body.fileName,
      req.user.email,
      req.user.role,
    );
  }

  @Get(':quizId')
  async getQuiz(@Param('quizId') quizId: string) {
    this.logger.log(`Retrieving quiz for quizId: ${quizId}`);
    try {
      const quiz = await this.cvService.getQuiz(quizId);
      this.logger.log(`Quiz retrieved: ${quizId}`);
      return quiz;
    } catch (error) {
      this.logger.error(
        `Quiz retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':quizId/results')
  @UseGuards(JwtAuthGuard)
  async getQuizResults(@Param('quizId') quizId: string, @Request() req: any) {
    this.logger.log(`Get quiz results for ${quizId} by ${req.user.email}`);
    return this.cvService.getQuizResults(quizId, req.user.email, req.user.role);
  }

  @Post(':quizId/submit')
  async submitQuizAnswers(
    @Param('quizId') quizId: string,
    @Body()
    body: { answers: { [questionId: string]: number }; timeTaken: number },
  ) {
    this.logger.log(`Submit quiz answers for ${quizId}`);
    if (!body.answers || !body.timeTaken) {
      this.logger.warn('Missing answers or timeTaken in request body');
      throw new BadRequestException('Answers and timeTaken are required');
    }
    return this.cvService.submitQuizAnswers(
      quizId,
      body.answers,
      body.timeTaken,
    );
  }
}

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly cvService: CvService) {}

  @Post('quiz')
  async sendQuizEmail(
    @Body() body: { email: string; quizLink: string },
    @Request() req: any,
  ) {
    this.logger.log(`Send quiz email to ${body.email} by ${req.user.email}`);
    if (!body.email || !body.quizLink) {
      this.logger.warn('Missing email or quizLink in request body');
      throw new BadRequestException('Email and quizLink are required');
    }
    await this.cvService.sendQuizEmail(
      body.email,
      body.quizLink,
      req.user.email,
      req.user.role,
    );
    return { message: 'Quiz email sent successfully' };
  }
}
