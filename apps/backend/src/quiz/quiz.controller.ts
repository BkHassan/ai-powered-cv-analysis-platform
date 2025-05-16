import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  BadRequestException,
  UseGuards,
  Logger,
  Query,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('quiz')
export class QuizController {
  private readonly logger = new Logger(QuizController.name);

  constructor(private readonly quizService: QuizService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateQuiz(
    @Body()
    body: {
      fileName: string;
      candidateEmail?: string;
      questionCount?: number;
      timeLimit?: number;
    },
    @Request() req: any,
  ) {
    this.logger.log(`Generate quiz for ${body.fileName} by ${req.user.email}`);
    if (!body.fileName) {
      this.logger.warn('Missing fileName in request body');
      throw new BadRequestException('fileName is required');
    }
    if (
      body.questionCount &&
      (body.questionCount < 1 || body.questionCount > 20)
    ) {
      this.logger.warn(`Invalid questionCount: ${body.questionCount}`);
      throw new BadRequestException('questionCount must be between 1 and 20');
    }
    if (body.timeLimit && body.timeLimit < 60) {
      this.logger.warn(`Invalid timeLimit: ${body.timeLimit}`);
      throw new BadRequestException('timeLimit must be at least 60 seconds');
    }
    return this.quizService.generateQuiz(
      body.fileName,
      req.user.email,
      req.user.role,
      body.candidateEmail,
      body.questionCount || 5,
      body.timeLimit,
    );
  }

  @Get(':quizId')
  async getQuiz(
    @Param('quizId') quizId: string,
    @Query('token') token: string,
  ) {
    this.logger.log(`Retrieving quiz for quizId: ${quizId}`);
    try {
      const quiz = await this.quizService.getQuiz(quizId, token);
      this.logger.log(`Quiz retrieved: ${quizId}`);
      return quiz;
    } catch (error) {
      this.logger.error(`Quiz retrieval failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':quizId/results')
  @UseGuards(JwtAuthGuard)
  async getQuizResults(@Param('quizId') quizId: string, @Request() req: any) {
    this.logger.log(`Get quiz results for ${quizId} by ${req.user.email}`);
    return this.quizService.getQuizResults(
      quizId,
      req.user.email,
      req.user.role,
    );
  }

  @Post(':quizId/submit')
  async submitQuizAnswers(
    @Param('quizId') quizId: string,
    @Body()
    body: { answers: { [questionId: string]: number }; timeTaken: number },
    @Query('token') token: string,
  ) {
    this.logger.log(`Submit quiz answers for ${quizId}`);
    if (!body.answers || !body.timeTaken) {
      this.logger.warn('Missing answers or timeTaken in request body');
      throw new BadRequestException('Answers and timeTaken are required');
    }
    return this.quizService.submitQuizAnswers(
      quizId,
      body.answers,
      body.timeTaken,
      token,
    );
  }

  @Post('email')
  @UseGuards(JwtAuthGuard)
  async sendQuizEmail(
    @Body() body: { email: string; quizLink: string },
    @Request() req: any,
  ) {
    this.logger.log(`Send quiz email to ${body.email} by ${req.user.email}`);
    if (!body.email || !body.quizLink) {
      this.logger.warn('Missing email or quizLink in request body');
      throw new BadRequestException('Email and quizLink are required');
    }
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (!emailRegex.test(body.email)) {
      this.logger.warn(`Invalid email format: ${body.email}`);
      throw new BadRequestException('Invalid email format');
    }
    await this.quizService.sendQuizEmail(
      body.email,
      body.quizLink,
      req.user.email,
      req.user.role,
    );
    return { message: 'Quiz email sent successfully' };
  }

  @Get('skills/:fileName')
  @UseGuards(JwtAuthGuard)
  async getCvSkills(@Param('fileName') fileName: string) {
    this.logger.log(`Get CV skills for ${fileName}`);
    return this.quizService.getCvSkills(fileName);
  }

  @Get('cv/:fileName')
  @UseGuards(JwtAuthGuard)
  async getQuizzesForCv(
    @Param('fileName') fileName: string,
    @Request() req: any,
  ) {
    this.logger.log(`Get quizzes for CV ${fileName} by ${req.user.email}`);
    return this.quizService.getQuizzesForCv(
      fileName,
      req.user.email,
      req.user.role,
    );
  }

  @Get('cv/:fileName/attempts')
  @UseGuards(JwtAuthGuard)
  async getQuizAttempts(
    @Param('fileName') fileName: string,
    @Request() req: any,
  ) {
    this.logger.log(
      `Get quiz attempts for CV ${fileName} by ${req.user.email}`,
    );
    return this.quizService.getQuizAttempts(
      fileName,
      req.user.email,
      req.user.role,
    );
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getAllQuizzes(@Request() req: any) {
    this.logger.log(`Get all quizzes by ${req.user.email}`);
    return this.quizService.getAllQuizzes(req.user.email, req.user.role);
  }
}
