import { Injectable, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private baseUrl: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    const host = this.configService.get<string>('CHROMADB_HOST', 'localhost');
    const port = this.configService.get<string>('CHROMADB_PORT', '8000');
    const secret = this.configService.get<string>('JWT_SECRET', 'my-secret-key');
    console.log('JWT_SECRET:', secret);
    console.log('ChromaDB:', `http://${host}:${port}`);
    this.baseUrl = `http://${host}:${port}/api/v1`;
    this.initUsersCollection().catch(err => console.error('Init users collection error:', err.message));
  }

  async initUsersCollection() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/collections`),
      );
      const collections = response.data;
      if (collections.some(c => c.name === 'users')) {
        console.log('Users collection exists');
        return;
      }
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/collections`, { name: 'users' }),
      );
      console.log('Users collection created');
    } catch (error) {
      console.error('Failed to initialize users collection:', error.message);
      throw new InternalServerErrorException('Failed to connect to users database.');
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/collections/users/get`),
      );
      const users = response.data;
      const user = users.metadatas?.find(u => u.email === email);
      if (user && pass === 'password') {
        return { id: users.ids[users.metadatas.indexOf(user)], email, role: user.role || 'user' };
      }
      return null;
    } catch (error) {
      console.error('Validate user error:', error.message);
      throw new InternalServerErrorException('Failed to validate user');
    }
  }

  async signup(email: string, password: string, role: string = 'user') {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/collections/users/get`),
      );
      const users = response.data;
      const existing = users.metadatas?.find(u => u.email === email);
      if (existing) {
        throw new ForbiddenException('Email already exists');
      }
      const id = `user_${Date.now()}`;
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/collections/users/add`, {
          documents: [`User ${email}`],
          metadatas: [{ email, role }],
          ids: [id],
        }),
      );
      return this.login({ id, email, role });
    } catch (error) {
      console.error('Signup error:', error.message);
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('Failed to sign up user');
    }
  }

  async login(user: any) {
    try {
      const payload = { email: user.email, sub: user.id, role: user.role };
      return {
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      console.error('Token generation error:', error.message);
      throw new InternalServerErrorException('Failed to generate token');
    }
  }

  async forgotPassword(email: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/collections/users/get`),
      );
      const users = response.data;
      const user = users.metadatas?.find(u => u.email === email);
      if (!user) {
        throw new ForbiddenException('User not found');
      }
      const resetToken = this.jwtService.sign(
        { sub: users.ids[users.metadatas.indexOf(user)], email },
        { expiresIn: '15m' },
      );
      console.log(`Reset token for ${email}: ${resetToken}`);
      return { message: 'Reset token generated—check console' };
    } catch (error) {
      console.error('Forgot password error:', error.message);
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('Failed to process password reset');
    }
  }

  async clearUsers() {
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/collections/users`),
      );
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/collections`, { name: 'users' }),
      );
      return { message: 'Users cleared' };
    } catch (error) {
      console.error('Clear users error:', error.message);
      throw new InternalServerErrorException('Failed to clear users');
    }
  }
}