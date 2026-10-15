import { IsBoolean, IsOptional } from 'class-validator';

export class RunEvalDto {
  @IsOptional()
  @IsBoolean()
  includeJudge?: boolean;
}
