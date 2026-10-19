"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const chromadb_1 = require("chromadb");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const generative_ai_1 = require("@google/generative-ai");
const uuid_1 = require("uuid");
const config_1 = require("@nestjs/config");
const email_services_1 = require("../email/email.services");
class GeminiEmbeddingFunction {
    logger = new common_1.Logger(GeminiEmbeddingFunction.name);
    client;
    constructor(configService) {
        const GEMINI_API_KEY = configService.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) {
            this.logger.warn('GEMINI_API_KEY is not defined in .env — embedding features disabled');
            this.client = null;
            return;
        }
        this.client = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
        this.logger.log('Gemini client initialized successfully');
    }
    async generate(texts) {
        if (!this.client) {
            throw new Error('GEMINI_API_KEY is required for embeddings');
        }
        try {
            const model = this.client.getGenerativeModel({
                model: 'gemini-embedding-001',
            });
            const embeddings = [];
            for (const text of texts) {
                const result = await model.embedContent(text);
                const embedding = result.embedding.values;
                embeddings.push(embedding);
            }
            this.logger.log(`Generated embeddings for ${texts.length} texts`);
            return embeddings;
        }
        catch (error) {
            this.logger.error(`Failed to generate embeddings',
        ${error.message}`, error.message);
            throw new Error('Gemini embedding generation failed');
        }
    }
}
let AuthService = AuthService_1 = class AuthService {
    jwtService;
    chromaClient;
    configService;
    emailService;
    userCollection;
    resetTokenCollection;
    otpTokenCollection;
    logger = new common_1.Logger(AuthService_1.name);
    embeddingFunction;
    constructor(jwtService, chromaClient, configService, emailService) {
        this.jwtService = jwtService;
        this.chromaClient = chromaClient;
        this.configService = configService;
        this.emailService = emailService;
        this.embeddingFunction = new GeminiEmbeddingFunction(configService);
    }
    async initializeCollections() {
        try {
            this.userCollection = await this.chromaClient.getOrCreateCollection({
                name: 'users',
                embeddingFunction: this.embeddingFunction,
            });
            this.resetTokenCollection = await this.chromaClient.getOrCreateCollection({
                name: 'reset_tokens',
                embeddingFunction: this.embeddingFunction,
            });
            this.otpTokenCollection = await this.chromaClient.getOrCreateCollection({
                name: 'otp_tokens',
                embeddingFunction: this.embeddingFunction,
            });
            this.logger.log('ChromaDB collections initialized successfully');
        }
        catch (error) {
            this.logger.error(`Failed to initialize ChromaDB collections',
        ${error.message}`, error.message);
            throw new Error('ChromaDB initialization failed');
        }
    }
    async onModuleInit() {
        void this.bootstrapCollections();
    }
    async bootstrapCollections(maxAttempts = 12) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await this.initializeCollections();
                if (!this.configService.get('GEMINI_API_KEY')) {
                    this.logger.warn('GEMINI_API_KEY not set — skipping admin user bootstrap until configured');
                    return;
                }
                await this.ensureAdminUser();
                return;
            }
            catch (error) {
                if (attempt === maxAttempts) {
                    this.logger.error(`ChromaDB unreachable after ${maxAttempts} attempts — authentication will fail until it is restored`, error.message);
                    return;
                }
                const delayMs = Math.min(15000, attempt * 3000);
                this.logger.warn(`ChromaDB not ready (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    }
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async ensureAdminUser() {
        try {
            this.logger.log('Checking for admin user in ChromaDB');
            const result = await this.userCollection.get();
            const adminExists = result.documents.some((doc) => {
                if (!doc)
                    return false;
                const userDoc = JSON.parse(doc);
                return userDoc.role === 'admin';
            });
            if (adminExists) {
                this.logger.log('Admin user already exists');
                return;
            }
            this.logger.log('No admin user found, creating one');
            const email = this.configService.get('ADMIN_EMAIL');
            const password = this.configService.get('ADMIN_PASSWORD');
            const firstName = this.configService.get('ADMIN_FIRST_NAME');
            const lastName = this.configService.get('ADMIN_LAST_NAME');
            if (!email || !password || !firstName || !lastName) {
                this.logger.error('Missing admin credentials in .env');
                throw new Error('ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, and ADMIN_LAST_NAME must be defined in .env');
            }
            const existingUser = await this.userCollection.get({
                where: { email },
            });
            if (existingUser.ids.length > 0) {
                this.logger.warn(`Email ${email} already exists, cannot create admin`);
                throw new common_1.ConflictException(`Admin email ${email} is already in use`);
            }
            const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!passwordPattern.test(password)) {
                this.logger.error('Admin password does not meet strength requirements');
                throw new common_1.BadRequestException('Admin password must be at least 8 characters long, contain one uppercase letter, one number, and one special character');
            }
            this.logger.log('Hashing admin password');
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = `admin_${(0, uuid_1.v4)()}`;
            const name = `${firstName} ${lastName}`;
            const userDocument = JSON.stringify({
                name,
                email,
                password: hashedPassword,
                cv_id: [],
                role: 'admin',
                tier: 'Premium',
                isEmailVerified: true,
                createdDate: new Date().toISOString(),
            });
            this.logger.log('Storing admin user in ChromaDB');
            await this.userCollection.add({
                ids: [userId],
                documents: [userDocument],
                metadatas: [{ email }],
            });
            this.logger.log(`Admin user created successfully: ${userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to ensure admin user',
        ${error.message}`, error.message);
            throw error;
        }
    }
    async signup(signupDto) {
        const { firstName, lastName, email, password } = signupDto;
        try {
            this.logger.log(`Checking for existing user with email: ${email}`);
            const existingUser = await this.userCollection.get({
                where: { email },
            });
            if (existingUser.ids.length > 0) {
                throw new common_1.ConflictException('Email already exists');
            }
            const trimmedFirstName = firstName.trim();
            const trimmedLastName = lastName.trim();
            if (!trimmedFirstName || !trimmedLastName) {
                throw new common_1.BadRequestException('First name and last name cannot be empty');
            }
            const name = `${trimmedFirstName} ${trimmedLastName}`;
            const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!passwordPattern.test(password)) {
                throw new common_1.BadRequestException('Password must be at least 8 characters long, contain one uppercase letter, one number, and one special character');
            }
            this.logger.log('Hashing password');
            const hashedPassword = await bcrypt.hash(password, 10);
            this.logger.log('Generating OTP');
            const otp = this.generateOTP();
            const expiresAt = Date.now() + 5 * 60 * 1000;
            const otpDocument = JSON.stringify({
                email,
                otp,
                expiresAt,
                verified: false,
            });
            this.logger.log('Storing OTP in ChromaDB');
            const otpId = `otp_${(0, uuid_1.v4)()}`;
            await this.otpTokenCollection.add({
                ids: [otpId],
                documents: [otpDocument],
                metadatas: [{ email }],
            });
            this.logger.log('Sending OTP email');
            const emailSent = await this.emailService.sendOtpEmail(email, otp);
            if (!emailSent) {
                this.logger.warn(`OTP email could not be sent to ${email}; user account will still be created`);
            }
            this.logger.log('Storing user in ChromaDB');
            const userId = `user_${(0, uuid_1.v4)()}`;
            const createdDate = new Date().toISOString();
            const userDocument = JSON.stringify({
                name,
                email,
                password: hashedPassword,
                cv_id: [],
                role: 'user',
                tier: 'Free',
                isEmailVerified: false,
                createdDate,
            });
            await this.userCollection.add({
                ids: [userId],
                documents: [userDocument],
                metadatas: [{ email }],
            });
            this.logger.log(`User stored successfully: ${userId}`);
            this.logger.log('Generating JWT');
            const payload = {
                sub: userId,
                email,
                role: 'user',
                tier: 'Free',
                emailVerified: false,
            };
            const accessToken = this.jwtService.sign(payload);
            return { accessToken };
        }
        catch (error) {
            this.logger.error(`Signup failed', ${error.message}`, error.message);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.ServiceUnavailableException(`Account creation is currently unavailable: ${error.message}`);
        }
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        try {
            this.logger.log(`Finding user with email: ${email}`);
            const result = await this.userCollection.get({
                where: { email },
            });
            if (result.ids.length === 0 || !result.documents[0]) {
                throw new common_1.UnauthorizedException('User not found');
            }
            const userDoc = JSON.parse(result.documents[0]);
            if (!userDoc.isEmailVerified) {
                throw new common_1.UnauthorizedException('Email not verified. Please verify your email with the OTP sent.');
            }
            this.logger.log('Verifying password');
            const isPasswordValid = await bcrypt.compare(password, userDoc.password);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException('Incorrect password');
            }
            this.logger.log('Generating JWT for login');
            const payload = {
                sub: result.ids[0],
                email,
                role: userDoc.role,
                tier: userDoc.tier || 'Free',
                emailVerified: true,
            };
            const accessToken = this.jwtService.sign(payload);
            return { accessToken };
        }
        catch (error) {
            this.logger.error(`Login failed', ${error.message}`, error.message);
            throw error;
        }
    }
    async verifyOtp(dto) {
        try {
            this.logger.log(`Verifying OTP for email: ${dto.email}`);
            const result = await this.otpTokenCollection.get({
                where: { email: dto.email },
            });
            if (result.ids.length === 0 || !result.documents[0]) {
                this.logger.error('No OTP found in database');
                throw new common_1.UnauthorizedException('Invalid or expired OTP');
            }
            const otpDoc = JSON.parse(result.documents[0]);
            this.logger.log(`Stored OTP in database: ${otpDoc.otp}`);
            this.logger.log(`OTP expiration: ${new Date(otpDoc.expiresAt).toISOString()}`);
            this.logger.log(`Current time: ${new Date().toISOString()}`);
            if (otpDoc.otp !== dto.otp) {
                this.logger.error(`OTP mismatch - Received: ${dto.otp}, Stored: ${otpDoc.otp}`);
                throw new common_1.UnauthorizedException('Invalid OTP');
            }
            if (otpDoc.expiresAt < Date.now()) {
                this.logger.error('OTP expired');
                await this.otpTokenCollection.delete({ ids: [result.ids[0]] });
                throw new common_1.UnauthorizedException('OTP expired');
            }
            this.logger.log(`Marking email ${dto.email} as verified`);
            const userResult = await this.userCollection.get({
                where: { email: dto.email },
            });
            if (userResult.ids.length === 0 || !userResult.documents[0]) {
                throw new common_1.NotFoundException('User not found');
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
        }
        catch (error) {
            this.logger.error(`OTP verification failed: ${error.message}`);
            throw error;
        }
    }
    async forgotPassword(forgotPasswordDto) {
        const { email } = forgotPasswordDto;
        try {
            this.logger.log(`Checking user with email: ${email}`);
            const result = await this.userCollection.get({
                where: { email },
            });
            if (result.ids.length === 0 || !result.documents[0]) {
                throw new common_1.NotFoundException('User not found');
            }
            const existingOtp = await this.otpTokenCollection.get({
                where: { email },
            });
            if (existingOtp.ids.length > 0) {
                this.logger.log('Deleting existing OTP');
                await this.otpTokenCollection.delete({ ids: existingOtp.ids });
            }
            this.logger.log('Generating OTP');
            const otp = this.generateOTP();
            this.logger.log(`Generated OTP: ${otp}`);
            const expiresAt = Date.now() + 5 * 60 * 1000;
            const otpDocument = JSON.stringify({
                email,
                otp,
                expiresAt,
                verified: false,
            });
            this.logger.log('Storing OTP in ChromaDB');
            const otpId = `otp_${(0, uuid_1.v4)()}`;
            await this.otpTokenCollection.add({
                ids: [otpId],
                documents: [otpDocument],
                metadatas: [{ email }],
            });
            this.logger.log('Sending OTP email');
            const emailSent = await this.emailService.sendOtpEmail(email, otp);
            if (!emailSent) {
                this.logger.warn(`OTP email could not be sent to ${email}; password reset OTP is stored but email delivery failed`);
            }
        }
        catch (error) {
            this.logger.error(`Forgot password failed: ${error.message}`, error.stack);
            throw error;
        }
    }
    async resetPassword(resetPasswordDto) {
        const { email, otp, newPassword } = resetPasswordDto;
        try {
            await this.verifyOtp({ email, otp });
            this.logger.log(`Finding user with email: ${email}`);
            const userResult = await this.userCollection.get({
                where: { email },
            });
            if (userResult.ids.length === 0 || !userResult.documents[0]) {
                throw new common_1.NotFoundException('User not found');
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
        }
        catch (error) {
            this.logger.error(`Reset password failed', ${error.message}`, error.message);
            throw error;
        }
    }
    async deleteUserByEmail(email, requesterRole) {
        if (requesterRole !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can delete users');
        }
        const result = await this.userCollection.get({
            where: { email },
        });
        if (!result.ids || result.ids.length === 0) {
            throw new common_1.NotFoundException(`User with email ${email} not found`);
        }
        await this.userCollection.delete({ ids: result.ids });
        this.logger.log(`Deleted user with email: ${email}`);
    }
    async getAllUsers(requesterRole) {
        if (requesterRole !== 'admin') {
            this.logger.warn('Unauthorized attempt to list users');
            throw new common_1.ForbiddenException('Only admins can view all users');
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
                    const parsedDoc = JSON.parse(doc);
                    const userId = result.ids[index];
                    const createdDate = parsedDoc.createdDate || this.inferCreatedDate(userId);
                    return {
                        id: userId,
                        name: parsedDoc.name,
                        email: parsedDoc.email,
                        role: parsedDoc.role,
                        tier: parsedDoc.tier || 'Free',
                        isEmailVerified: parsedDoc.isEmailVerified,
                        cv_id: parsedDoc.cv_id || [],
                        createdDate,
                    };
                }
                catch (error) {
                    this.logger.error(`Failed to parse user document ${result.ids[index]}: ${error.message}`);
                    return null;
                }
            })
                .filter((user) => user !== null);
            this.logger.log(`Retrieved ${users.length} users`);
            return users;
        }
        catch (error) {
            this.logger.error(`Failed to fetch users: ${error.message}`);
            throw error;
        }
    }
    async updateUserRole(email, newRole, requesterEmail, requesterRole) {
        if (requesterRole !== 'admin') {
            this.logger.warn(`Unauthorized role update attempt by ${requesterEmail}`);
            throw new common_1.ForbiddenException('Only admins can update user roles');
        }
        if (!['user', 'admin'].includes(newRole)) {
            throw new common_1.BadRequestException('Role must be user or admin');
        }
        if (email === requesterEmail && newRole === 'user') {
            const adminCountResult = await this.userCollection.get();
            const adminCount = adminCountResult.documents.filter((doc) => {
                if (!doc)
                    return false;
                const userDoc = JSON.parse(doc);
                return userDoc.role === 'admin';
            }).length;
            if (adminCount <= 1) {
                this.logger.warn(`Cannot demote last admin ${email}`);
                throw new common_1.BadRequestException('Cannot demote the last admin user');
            }
        }
        try {
            this.logger.log(`Updating role for ${email} to ${newRole}`);
            const result = await this.userCollection.get({
                where: { email },
            });
            if (result.ids.length === 0 || !result.documents[0]) {
                throw new common_1.NotFoundException(`User with email ${email} not found`);
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
        }
        catch (error) {
            this.logger.error(`Failed to update role for ${email}: ${error.message}`);
            throw error;
        }
    }
    async updateUserTier(email, tier, requesterRole) {
        if (requesterRole !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can update user tiers');
        }
        if (!['Free', 'Premium'].includes(tier)) {
            throw new common_1.BadRequestException('Tier must be Free or Premium');
        }
        const result = await this.userCollection.get({ where: { email } });
        if (result.ids.length === 0 || !result.documents[0]) {
            throw new common_1.NotFoundException(`User with email ${email} not found`);
        }
        const userDoc = JSON.parse(result.documents[0]);
        await this.userCollection.update({
            ids: [result.ids[0]],
            documents: [JSON.stringify({ ...userDoc, tier })],
            metadatas: [{ email }],
        });
        this.logger.log(`Updated tier for ${email} to ${tier}`);
    }
    inferCreatedDate(userId) {
        const suffix = userId.split('_').pop() ?? '';
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(suffix);
        if (isUuid) {
            return null;
        }
        const timestamp = parseInt(suffix.slice(0, 13), 16);
        if (Number.isNaN(timestamp) || timestamp < 1_000_000_000_000) {
            return null;
        }
        return new Date(timestamp).toISOString();
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        chromadb_1.ChromaClient,
        config_1.ConfigService,
        email_services_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map