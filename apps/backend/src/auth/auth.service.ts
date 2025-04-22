import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { ChromaClient, Collection, DefaultEmbeddingFunction } from 'chromadb';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private collection: Collection;
  private readonly logger = new Logger(AuthService.name);
  private readonly embeddingFunction = new DefaultEmbeddingFunction();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chromaClient: ChromaClient,
  ) {
    this.chromaClient = new ChromaClient({ path: 'http://chromadb:8000' });
    this.initializeCollection();
  }

  private async initializeCollection() {
    try {
      this.collection = await this.chromaClient.getOrCreateCollection({
        name: 'users',
        embeddingFunction: this.embeddingFunction,
      });
      this.logger.log('ChromaDB collection initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ChromaDB collection', error);
      throw new Error('ChromaDB initialization failed');
    }
  }

  async signup(signupDto: SignupDto): Promise<{ accessToken: string }> {
    const {name, email, password, role } = signupDto;

    try {
      // Check if user already exists
      const existingUser = await this.collection.get({
        where: { email },
      });
      if (existingUser.ids.length > 0) {
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Store user in ChromaDB
      const  userId= `user_${Date.now()}`;
      await this.collection.add({
        ids: [userId],
        documents: [JSON.stringify({ email, name, role, password: hashedPassword, cv_id: [] })],
        metadatas: [{ email }],
      });

      // Generate JWT
      const payload = { sub: userId, email, role };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    } catch (error) {
      this.logger.error('Signup failed', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;

    try {
      // Find user
      const result = await this.collection.get({
        where: { email },
      });

      if (result.ids.length === 0) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const userDoc = JSON.parse(result.documents[0]!);
      const isPasswordValid = await bcrypt.compare(password, userDoc.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT
      const payload = { sub: result.ids[0], email, role: userDoc.role };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }
}