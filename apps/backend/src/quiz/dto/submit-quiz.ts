import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class SubmitQuizDto {
  @IsObject()
  answers: { [questionIndex: number]: string };

  @IsString()
  @IsNotEmpty()
  candidateEmail: string;
}