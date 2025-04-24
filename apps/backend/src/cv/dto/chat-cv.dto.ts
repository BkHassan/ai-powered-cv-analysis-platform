import { IsString } from 'class-validator';

export class ChatCvDto {
  @IsString()
  message: string;
}