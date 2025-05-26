import {
  Injectable,
  OnModuleInit,
  ConflictException,
  UnauthorizedException,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChromaClient, Collection, IEmbeddingFunction } from 'chromadb';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.services';

class GeminiEmbeddingFunction implements IEmbeddingFunction {
  private readonly logger = new Logger(GeminiEmbeddingFunction.name);
  private readonly client: GoogleGenerativeAI;

  constructor(configService: ConfigService) {
    const GEMINI_API_KEY = configService.get<string>('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      this.logger.error('GEMINI_API_KEY is not defined in .env');
      throw new Error('GEMINI_API_KEY is required');
    }
    this.client = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.logger.log('Gemini client initialized successfully');
  }

  async generate(texts: string[]): Promise<number[][]> {
    try {
      const model = this.client.getGenerativeModel({
        model: 'text-embedding-004',
      });
      const embeddings: number[][] = [];
      for (const text of texts) {
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        embeddings.push(embedding);
      }
      this.logger.log(`Generated embeddings for ${texts.length} texts`);
      return embeddings;
    } catch (error) {
      this.logger.error(
        `Failed to generate embeddings',
        ${error.message}`,
        error.message,
      );
      throw new Error('Gemini embedding generation failed');
    }
  }
}

@Injectable()
export class AuthService implements OnModuleInit {
  private userCollection: Collection;
  private resetTokenCollection: Collection;
  private otpTokenCollection: Collection;
  private readonly logger = new Logger(AuthService.name);
  private readonly embeddingFunction: IEmbeddingFunction;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chromaClient: ChromaClient,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.embeddingFunction = new GeminiEmbeddingFunction(configService);
  }

  private async initializeCollections() {
    try {
      this.userCollection = await this.chromaClient.getOrCreateCollection({
        name: 'users',
        embeddingFunction: this.embeddingFunction,
      });
      this.resetTokenCollection = await this.chromaClient.getOrCreateCollection(
        {
          name: 'reset_tokens',
          embeddingFunction: this.embeddingFunction,
        },
      );
      this.otpTokenCollection = await this.chromaClient.getOrCreateCollection({
        name: 'otp_tokens',
        embeddingFunction: this.embeddingFunction,
      });
      this.logger.log('ChromaDB collections initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize ChromaDB collections',
        ${error.message}`,
        error.message,
      );
      throw new Error('ChromaDB initialization failed');
    }
  }

  async onModuleInit() {
    try {
      await this.initializeCollections();
      await this.ensureAdminUser();
      // await this.debugUsers();
    } catch (error) {
      this.logger.error(
        `Failed to ensure admin user on startup',
        ${error.message}`,
        error.message,
      );
      throw error;
    }
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  }

  private async ensureAdminUser() {
    try {
      this.logger.log('Checking for admin user in ChromaDB');

      // Query for admin users
      const result = await this.userCollection.get();
      const adminExists = result.documents.some((doc) => {
        if (!doc) return false;
        const userDoc = JSON.parse(doc);
        return userDoc.role === 'admin';
      });

      if (adminExists) {
        this.logger.log('Admin user already exists');
        return;
      }

      this.logger.log('No admin user found, creating one');

      // Load admin credentials from .env
      const email = this.configService.get<string>('ADMIN_EMAIL');
      const password = this.configService.get<string>('ADMIN_PASSWORD');
      const firstName = this.configService.get<string>('ADMIN_FIRST_NAME');
      const lastName = this.configService.get<string>('ADMIN_LAST_NAME');

      if (!email || !password || !firstName || !lastName) {
        this.logger.error('Missing admin credentials in .env');
        throw new Error(
          'ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, and ADMIN_LAST_NAME must be defined in .env',
        );
      }

      // Check for email conflict
      const existingUser = await this.userCollection.get({
        where: { email },
      });
      if (existingUser.ids.length > 0) {
        this.logger.warn(`Email ${email} already exists, cannot create admin`);
        throw new ConflictException(`Admin email ${email} is already in use`);
      }

      // Validate password strength (consistent with signup)
      const passwordPattern =
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordPattern.test(password)) {
        this.logger.error('Admin password does not meet strength requirements');
        throw new BadRequestException(
          'Admin password must be at least 8 characters long, contain one uppercase letter, one number, and one special character',
        );
      }

      // Hash password
      this.logger.log('Hashing admin password');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create admin user
      const userId = `admin_${uuidv4()}`;
      const name = `${firstName} ${lastName}`;
      const userDocument = JSON.stringify({
        name,
        email,
        password: hashedPassword,
        cv_id: [],
        role: 'admin',
        isEmailVerified: true,
      });

      this.logger.log('Storing admin user in ChromaDB');
      await this.userCollection.add({
        ids: [userId],
        documents: [userDocument],
        metadatas: [{ email }],
      });

      this.logger.log(`Admin user created successfully: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to ensure admin user',
        ${error.message}`,
        error.message,
      );
      throw error;
    }
  }

  async signup(signupDto: SignupDto): Promise<{ accessToken: string }> {
    const { firstName, lastName, email, password } = signupDto;

    try {
      this.logger.log(`Checking for existing user with email: ${email}`);
      const existingUser = await this.userCollection.get({
        where: { email },
      });
      if (existingUser.ids.length > 0) {
        throw new ConflictException('Email already exists');
      }

      // Validate firstName and lastName
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      if (!trimmedFirstName || !trimmedLastName) {
        throw new BadRequestException(
          'First name and last name cannot be empty',
        );
      }

      // Combine firstName and lastName into name
      const name = `${trimmedFirstName} ${trimmedLastName}`;

      //validate password strength
      const passwordPattern =
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordPattern.test(password)) {
        throw new BadRequestException(
          'Password must be at least 8 characters long, contain one uppercase letter, one number, and one special character',
        );
      }

      this.logger.log('Hashing password');
      const hashedPassword = await bcrypt.hash(password, 10);

      this.logger.log('Generating OTP');
      const otp = this.generateOTP();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      const otpDocument = JSON.stringify({
        email,
        otp,
        expiresAt,
        verified: false,
      });

      this.logger.log('Storing OTP in ChromaDB');
      const otpId = `otp_${uuidv4()}`;
      await this.otpTokenCollection.add({
        ids: [otpId],
        documents: [otpDocument],
        metadatas: [{ email }],
      });

      this.logger.log('Sending OTP email');
      await this.emailService.sendOtpEmail(email, otp);

      this.logger.log('Storing user in ChromaDB');
      const userId = `user_${uuidv4()}`;
      const createdDate = new Date().toISOString();
      const userDocument = JSON.stringify({
        name,
        email,
        password: hashedPassword,
        cv_id: [],
        role: 'user',
        isEmailVerified: false,
        createdDate,
      });

      //save the user data
      await this.userCollection.add({
        ids: [userId],
        documents: [userDocument],
        metadatas: [{ email }],
      });
      this.logger.log(`User stored successfully: ${userId}`);

      this.logger.log('Generating JWT');
      const payload = { sub: userId, email };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    } catch (error) {
      this.logger.error(`Signup failed', ${error.message}`, error.message);
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

      if (result.ids.length === 0 || !result.documents[0]) {
        throw new UnauthorizedException('User not found');
      }

      const userDoc = JSON.parse(result.documents[0]);
      if (!userDoc.isEmailVerified) {
        throw new UnauthorizedException(
          'Email not verified. Please verify your email with the OTP sent.',
        );
      }
      this.logger.log('Verifying password');
      const isPasswordValid = await bcrypt.compare(password, userDoc.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect password');
      }

      this.logger.log('Generating JWT for login');
      const payload = { sub: result.ids[0], email, role: userDoc.role };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    } catch (error) {
      this.logger.error(`Login failed', ${error.message}`, error.message);
      throw error;
    }
  }

  async verifyOtp(dto: { email: string; otp: string }): Promise<void> {
    try {
      this.logger.log(`Verifying OTP for email: ${dto.email}`);
      const result = await this.otpTokenCollection.get({
        where: { email: dto.email },
      });

      if (result.ids.length === 0 || !result.documents[0]) {
        this.logger.error('No OTP found in database');
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      const otpDoc = JSON.parse(result.documents[0]);
      this.logger.log(`Stored OTP in database: ${otpDoc.otp}`);
      this.logger.log(
        `OTP expiration: ${new Date(otpDoc.expiresAt).toISOString()}`,
      );
      this.logger.log(`Current time: ${new Date().toISOString()}`);

      if (otpDoc.otp !== dto.otp) {
        this.logger.error(
          `OTP mismatch - Received: ${dto.otp}, Stored: ${otpDoc.otp}`,
        );
        throw new UnauthorizedException('Invalid OTP');
      }
      if (otpDoc.expiresAt < Date.now()) {
        this.logger.error('OTP expired');
        await this.otpTokenCollection.delete({ ids: [result.ids[0]] });
        throw new UnauthorizedException('OTP expired');
      }

      this.logger.log(`Marking email ${dto.email} as verified`);
      const userResult = await this.userCollection.get({
        where: { email: dto.email },
      });

      if (userResult.ids.length === 0 || !userResult.documents[0]) {
        throw new NotFoundException('User not found');
      }

      const userDoc = JSON.parse(userResult.documents[0]);
      const updatedUserDoc = JSON.stringify({
        ...userDoc,
        isEmailVerified: true,
      });

      await this.userCollection.update({
        ids: [userResult.ids[0]],
        documents: [updatedUserDoc],
        metadatas: [{ email: dto.email }],
      });

      this.logger.log('Deleting used OTP');
      await this.otpTokenCollection.delete({ ids: [result.ids[0]] });

      this.logger.log(`Email ${dto.email} verified successfully`);
    } catch (error) {
      this.logger.error(`OTP verification failed: ${error.message}`);
      throw error;
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    try {
      this.logger.log(`Checking user with email: ${email}`);
      const result = await this.userCollection.get({
        where: { email },
      });

      if (result.ids.length === 0 || !result.documents[0]) {
        throw new NotFoundException('User not found');
      }

      // Delete any existing OTP for this email
      const existingOtp = await this.otpTokenCollection.get({
        where: { email },
      });
      if (existingOtp.ids.length > 0) {
        this.logger.log('Deleting existing OTP');
        await this.otpTokenCollection.delete({ ids: existingOtp.ids });
      }

      // Generate and store OTP
      this.logger.log('Generating OTP');
      const otp = this.generateOTP();
      this.logger.log(`Generated OTP: ${otp}`);

      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      const otpDocument = JSON.stringify({
        email,
        otp,
        expiresAt,
        verified: false,
      });

      this.logger.log('Storing OTP in ChromaDB');
      const otpId = `otp_${uuidv4()}`;
      await this.otpTokenCollection.add({
        ids: [otpId],
        documents: [otpDocument],
        metadatas: [{ email }],
      });

      // Send OTP email
      this.logger.log('Sending OTP email');
      await this.emailService.sendOtpEmail(email, otp);
    } catch (error) {
      this.logger.error(
        `Forgot password failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { email, otp, newPassword } = resetPasswordDto;

    try {
      // First verify the OTP using the existing verifyOtp function
      await this.verifyOtp({ email, otp });

      // If OTP is valid, proceed with password reset
      this.logger.log(`Finding user with email: ${email}`);
      const userResult = await this.userCollection.get({
        where: { email },
      });

      if (userResult.ids.length === 0 || !userResult.documents[0]) {
        throw new NotFoundException('User not found');
      }

      this.logger.log('Hashing new password');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const userDoc = JSON.parse(userResult.documents[0]);
      const updatedUserDoc = JSON.stringify({
        ...userDoc,
        password: hashedPassword,
      });

      this.logger.log('Updating user password in ChromaDB');
      await this.userCollection.update({
        ids: [userResult.ids[0]],
        documents: [updatedUserDoc],
        metadatas: [{ email }],
      });

      this.logger.log('Password reset successfully');
    } catch (error) {
      this.logger.error(
        `Reset password failed', ${error.message}`,
        error.message,
      );
      throw error;
    }
  }

  async deleteUserByEmail(email: string): Promise<void> {
    const result = await this.userCollection.get({
      where: { email },
    });

    if (!result.ids || result.ids.length === 0) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    await this.userCollection.delete({ ids: result.ids });
    this.logger.log(`Deleted user with email: ${email}`);
  }

  async getAllUsers(requesterRole: string): Promise<any[]> {
    if (requesterRole !== 'admin') {
      this.logger.warn('Unauthorized attempt to list users');
      throw new ForbiddenException('Only admins can view all users');
    }

    try {
      this.logger.log('Fetching all users from ChromaDB');
      const result = await this.userCollection.get();
      if (!result.documents || result.documents.length === 0) {
        this.logger.warn('No users found in userCollection');
        return [];
      }

      const users = result.documents
        .map((doc, index) => {
          try {
            const parsedDoc = JSON.parse(doc!);
            const userId = result.ids[index];
            const createdDate = parsedDoc.createdDate || this.inferCreatedDate(userId);
            return {
              id: userId,
              name: parsedDoc.name,
              email: parsedDoc.email,
              role: parsedDoc.role,
              isEmailVerified: parsedDoc.isEmailVerified,
              cv_id: parsedDoc.cv_id || [],
              createdDate,
            };
          } catch (error) {
            this.logger.error(`Failed to parse user document ${result.ids[index]}: ${error.message}`);
            return null;
          }
        })
        .filter((user) => user !== null);

      this.logger.log(`Retrieved ${users.length} users`);
      return users;
    } catch (error) {
      this.logger.error(`Failed to fetch users: ${error.message}`);
      throw error;
    }
  }

  async updateUserRole(email: string, newRole: 'user' | 'admin', requesterEmail: string, requesterRole: string): Promise<void> {
    if (requesterRole !== 'admin') {
      this.logger.warn(`Unauthorized role update attempt by ${requesterEmail}`);
      throw new ForbiddenException('Only admins can update user roles');
    }

    if (email === requesterEmail && newRole === 'user') {
      const adminCountResult = await this.userCollection.get();
      const adminCount = adminCountResult.documents.filter((doc) => {
        if (!doc) return false;
        const userDoc = JSON.parse(doc);
        return userDoc.role === 'admin';
      }).length;

      if (adminCount <= 1) {
        this.logger.warn(`Cannot demote last admin ${email}`);
        throw new BadRequestException('Cannot demote the last admin user');
      }
    }

    try {
      this.logger.log(`Updating role for ${email} to ${newRole}`);
      const result = await this.userCollection.get({
        where: { email },
      });

      if (result.ids.length === 0 || !result.documents[0]) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      const userDoc = JSON.parse(result.documents[0]);
      const updatedUserDoc = JSON.stringify({
        ...userDoc,
        role: newRole,
      });

      await this.userCollection.update({
        ids: [result.ids[0]],
        documents: [updatedUserDoc],
        metadatas: [{ email }],
      });

      this.logger.log(`Updated role for ${email} to ${newRole}`);
    } catch (error) {
      this.logger.error(`Failed to update role for ${email}: ${error.message}`);
      throw error;
    }
  }

  private inferCreatedDate(userId: string): string {
    const timestamp = parseInt(userId.split('_').pop()!.slice(0, 13), 16) || Date.now();
    return new Date(timestamp).toISOString();
  }

  // async debugUsers() {
  //   const result = await this.userCollection.get();
  //   console.log(
  //     'Users:',
  //     result.documents.map((doc) => JSON.parse(doc!)),
  //   );
  // }
}
