import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
import { VerifyOtpDto } from './dto/verify-otp.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(signupDto: SignupDto): Promise<{
        accessToken: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<void>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void>;
    deleteUser(email: string, req: any): Promise<void>;
    getAllUsers(req: any): Promise<any[]>;
    updateUserRole(email: string, role: 'user' | 'admin', req: any): Promise<void>;
    updateUserTier(email: string, tier: 'Free' | 'Premium', req: any): Promise<void>;
}
