import {
  Controller,
  Post,
  Body,
  Delete,
  Query,
  Get,
  Patch,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body(ValidationPipe) signupDto: SignupDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(loginDto);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body(ValidationPipe) verifyOtpDto: VerifyOtpDto,
  ): Promise<void> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto,
  ): Promise<void> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Delete('delete')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Query('email') email: string): Promise<void> {
    return this.authService.deleteUserByEmail(email);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Req() req: any): Promise<any[]> {
    return this.authService.getAllUsers(req.user.role);
  }

  @Patch('update-role')
  @UseGuards(JwtAuthGuard)
  async updateUserRole(
    @Body('email') email: string,
    @Body('role') role: 'user' | 'admin',
    @Req() req: any,
  ): Promise<void> {
    return this.authService.updateUserRole(email, role, req.user.email, req.user.role);
  }
}
