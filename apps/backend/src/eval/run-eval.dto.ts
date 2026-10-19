import { IsBoolean, IsOptional } from 'class-validator';

export class RunEvalDto {
  @IsOptional()
  @IsBoolean()
  includeJudge?: boolean;

  /** When true, PASS and FAIL cases are executed again. Default keeps them. */
  @IsOptional()
  @IsBoolean()
  rerunCompleted?: boolean;
}
