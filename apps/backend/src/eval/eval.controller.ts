import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EvalService } from './eval.service';
import { RunEvalDto } from './run-eval.dto';

@Controller('eval')
export class EvalController {
  constructor(private readonly evalService: EvalService) {}

  @Post('rag')
  @UseGuards(JwtAuthGuard)
  async runRagEval(@Body() body: RunEvalDto = {}, @Req() req) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Only admins can run quality evaluation');
    }
    return this.evalService.run(
      Boolean(body.includeJudge),
      Boolean(body.rerunCompleted),
    );
  }
}
