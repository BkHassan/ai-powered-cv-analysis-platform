import { Injectable, ConflictException, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { ChromaClient, Collection, IEmbeddingFunction } from 'chromadb';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

// Custom embedding function using Gemini API
class GeminiEmbeddingFunction implements IEmbeddingFunction {
  private readonly logger = new Logger(GeminiEmbeddingFunction.name);
  private readonly client: GoogleGenerativeAI;

  constructor() {
    const GEMINI_API_KEY = 'AIzaSyADup97tvmlHVXjRxOcqi2-7hWIypZVuMs'; // Replace with your Gemini API key
    this.client = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.logger.log('Gemini client initialized successfully');
  }

  async generate(texts: string[]): Promise<number[][]> {
    try {
      const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddings: number[][] = [];
      for (const text of texts) {
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        embeddings.push(embedding);
      }
      this.logger.log(`Generated embeddings for ${texts.length} texts`);
      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate embeddings', error.stack, error.message);
      throw new Error('Gemini embedding generation failed');
    }
  }
}

@Injectable()
export class AuthService {
  private userCollection: Collection;
  private resetTokenCollection: Collection;
  private readonly logger = new Logger(AuthService.name);
  private readonly embeddingFunction = new GeminiEmbeddingFunction();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chromaClient: ChromaClient,
  ) {
    this.initializeCollections();
  }

  private async initializeCollections() {
    try {
      this.userCollection = await this.chromaClient.getOrCreateCollection({
        name: 'users',
        embeddingFunction: this.embeddingFunction,
      });
      this.resetTokenCollection = await this.chromaClient.getOrCreateCollection({
        name: 'reset_tokens',
        embeddingFunction: this.embeddingFunction,
      });
      this.logger.log('ChromaDB collections initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ChromaDB collections', error.stack, error.message);
      throw new Error('ChromaDB initialization failed');
    }
  }

  async signup(signupDto: SignupDto): Promise<{ accessToken: string }> {
    const { name, email, password, role } = signupDto;

    try {
      this.logger.log(`Checking for existing user with email: ${email}`);
      const existingUser = await this.userCollection.get({
        where: { email },
      });
      if (existingUser.ids.length > 0) {
        throw new ConflictException('Email already exists');
      }

      this.logger.log('Hashing password');
      const hashedPassword = await bcrypt.hash(password, 10);

      this.logger.log('Storing user in ChromaDB');
      const userId = `user_${uuidv4()}`;
      const userDocument = JSON.stringify({ name, email, role, password: hashedPassword, cv_id: [] });
      await this.userCollection.add({
        ids: [userId],
        documents: [userDocument],
        metadatas: [{ email }],
      });
      this.logger.log(`User stored successfully: ${userId}`);

      this.logger.log('Generating JWT');
      const payload = { sub: userId, email, role };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    } catch (error) {
      this.logger.error('Signup failed', error.stack, error.message);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;

    try {
      this.logger.log(`Finding user with email: ${email}`);
      const result = await this.userCollection.get({
        where: { email },
      });

      if (result.ids.length === 0) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const userDoc = JSON.parse(result.documents[0]!);
      this.logger.log('Verifying password');
      const isPasswordValid = await bcrypt.compare(password, userDoc.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log('Generating JWT for login');
      const payload = { sub: result.ids[0], email, role: userDoc.role };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    } catch (error) {
      this.logger.error('Login failed', error.stack, error.message);
      throw error;
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ resetToken: string }> {
    const { email } = forgotPasswordDto;

    try {
      this.logger.log(`Checking user with email: ${email}`);
      const result = await this.userCollection.get({
        where: { email },
      });

      if (result.ids.length === 0) {
        throw new NotFoundException('User not found');
      }

      this.logger.log('Generating reset token');
      const resetToken = uuidv4();
      const expiresAt = Date.now() + 3600000; // 1 hour expiration
      const tokenDocument = JSON.stringify({ email, resetToken, expiresAt });

      this.logger.log('Storing reset token in ChromaDB');
      await this.resetTokenCollection.add({
        ids: [resetToken],
        documents: [tokenDocument],
        metadatas: [{ email }],
      });

      this.logger.log(`Reset token generated: ${resetToken}`);
      return { resetToken }; // For MVP, return token (no SendGrid)
    } catch (error) {
      this.logger.error('Forgot password failed', error.stack, error.message);
      throw error;
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { resetToken, newPassword } = resetPasswordDto;

    try {
      this.logger.log(`Validating reset token: ${resetToken}`);
      const result = await this.resetTokenCollection.get({
        ids: [resetToken],
      });

      if (result.ids.length === 0) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      const tokenDoc = JSON.parse(result.documents[0]!);
      if (tokenDoc.expiresAt < Date.now()) {
        await this.resetTokenCollection.delete({ ids: [resetToken] });
        throw new UnauthorizedException('Reset token expired');
      }

      this.logger.log(`Finding user with email: ${tokenDoc.email}`);
      const userResult = await this.userCollection.get({
        where: { email: tokenDoc.email },
      });

      if (userResult.ids.length === 0) {
        throw new NotFoundException('User not found');
      }

      this.logger.log('Hashing new password');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const userDoc = JSON.parse(userResult.documents[0]!);
      const updatedUserDoc = JSON.stringify({
        ...userDoc,
        password: hashedPassword,
      });

      this.logger.log('Updating user password in ChromaDB');
      await this.userCollection.update({
        ids: [userResult.ids[0]],
        documents: [updatedUserDoc],
        metadatas: [{ email: tokenDoc.email }],
      });

      this.logger.log('Deleting used reset token');
      await this.resetTokenCollection.delete({ ids: [resetToken] });

      this.logger.log('Password reset successfully');
    } catch (error) {
      this.logger.error('Reset password failed', error.stack, error.message);
      throw error;
    }
  }
}