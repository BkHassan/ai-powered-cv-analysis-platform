import { IsString, MinLength, IsEmail, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  otp: string;
  @IsString()
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,}$/, {
    message: 'Password must be at least 8 characters long, contain one uppercase letter, one number, and one special character',
  })
  newPassword: string;
}