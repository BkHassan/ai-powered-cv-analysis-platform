import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.error('SMTP configuration missing in .env');
      throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS must be defined in .env');
    }

    const port = Number(smtpPort);
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Without these, a blocked SMTP port stalls on nodemailer's ~2 minute
      // defaults and signup waits the whole time before answering.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    this.logger.log('Nodemailer transporter initialized');
  }

  async sendOtpEmail(to: string, otp: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        // SMTP_USER is the literal "apikey" for the SendGrid relay, which is not
        // a deliverable address; the sender identity is a separate setting.
        from: `"CV App" <${
          this.configService.get<string>('SENDGRID_FROM_EMAIL') ??
          this.configService.get<string>('SMTP_USER')
        }>`,
        to,
        subject: 'Your OTP Code',
        html: `
          <h2>Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #2563eb; background: #f3f4f6; padding: 10px; text-align: center; border-radius: 5px;">${otp}</h1>
          <p><strong>Important:</strong> Please enter this code exactly as shown above. The code is case-sensitive and must be entered in the correct order.</p>
          <p>It expires in 5 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });
      this.logger.log(`OTP email sent to ${to}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send OTP email to ${to} (signup/auth will continue): ${message}`,
      );
      return false;
    }
  }
}