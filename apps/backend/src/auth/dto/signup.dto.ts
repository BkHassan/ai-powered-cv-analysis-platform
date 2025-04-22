import { IsString, IsEmail, IsEnum, MinLength } from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export class SignupDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}