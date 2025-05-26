import { IsEmail, IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @IsEmail()
  email: string;

  @IsEnum(['user', 'admin'])
  role: 'user' | 'admin';
}