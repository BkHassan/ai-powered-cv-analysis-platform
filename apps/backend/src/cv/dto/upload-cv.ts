import { IsString, IsEmail, IsArray } from 'class-validator';

export class UploadCvDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  skills: string[];
}