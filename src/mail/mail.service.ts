import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { UserRole } from '../modules/users/entities/user-role.enum';
import { buildInvitationEmail } from './templates/invitation.template';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Provider-agnostic email boundary. Wraps Resend today; swap the implementation
 * (Postmark, SES, ...) here without touching business logic.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private resend!: Resend;
  private from!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.resend = new Resend(this.config.getOrThrow<string>('mail.resendApiKey'));
    this.from = this.config.getOrThrow<string>('mail.from');
  }

  async send(input: SendMailInput): Promise<{ id: string }> {
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error || !data) {
      this.logger.error(`Resend send failed to ${input.to}: ${error?.message}`);
      throw new InternalServerErrorException('Failed to send email');
    }
    return { id: data.id };
  }

  async sendInvitation(input: {
    to: string;
    fullName: string;
    role: UserRole;
    inviteLink: string;
    siteUrl: string;
  }): Promise<{ id: string }> {
    const { subject, html, text } = buildInvitationEmail({
      fullName: input.fullName,
      role: input.role,
      siteUrl: input.siteUrl,
      confirmationUrl: input.inviteLink,
    });
    return this.send({ to: input.to, subject, html, text });
  }
}
