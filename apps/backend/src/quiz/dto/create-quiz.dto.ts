import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsOptional()
  skill?: string; // Optional specific skill to focus the quiz on

  @IsString()
  @IsNotEmpty()
  candidateEmail: string;
}