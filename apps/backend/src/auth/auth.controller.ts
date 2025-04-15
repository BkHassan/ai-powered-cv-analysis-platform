import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new Error('Invalid credentials');
    return this.authService.login(user);
  }

  @Post('signup')
  async signup(@Body() body: { email: string; password: string; role?: string }) {
    return this.authService.signup(body.email, body.password, body.role);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Get('clear-users')
  async clearUsers() {
    return this.authService.clearUsers();
  }

  @Get('config')
  getConfig() {
    return {
      jwtSecret: this.configService.get<string>('JWT_SECRET') || 'NOT SET',
    };
  }
}