import { UserRole } from '../../modules/users/entities/user-role.enum';

export interface InvitationEmailInput {
  fullName: string;
  role: UserRole;
  confirmationUrl: string;
}

export interface InvitationEmail {
  subject: string;
  html: string;
  text: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.EDITOR]: 'Editor',
  [UserRole.VIEWER]: 'Viewer',
};

export function buildInvitationEmail(
  input: InvitationEmailInput,
): InvitationEmail {
  const roleLabel = ROLE_LABELS[input.role];
  const roleLabelHtml = escapeHtml(roleLabel);
  const confirmationUrl = escapeHtmlAttr(input.confirmationUrl);
  const confirmationUrlText = escapeHtml(input.confirmationUrl);
  const fullName = escapeHtml(input.fullName);
  const year = new Date().getFullYear();

  const subject = 'You’ve been invited to Resize Studio';
  const text = `Hi ${input.fullName},\n\nYou've been invited to join Resize Studio as an ${roleLabel}.\n\nAccept your invite and set up your account:\n${input.confirmationUrl}\n\nIf you weren't expecting this email, you can safely ignore it.`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${subject}</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #111827;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="background-color: #f4f4f5; padding: 32px 0;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="
              max-width: 600px;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
            "
          >
            <tr>
              <td
                style="
                  background: linear-gradient(135deg, #d6e2ff, #fde6d2);
                  padding: 24px 32px;
                  text-align: left;
                "
              >
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size: 0;">
                      <span
                        style="
                          display: inline-block;
                          width: 40px;
                          height: 40px;
                          border-radius: 12px;
                          background-color: rgba(255, 255, 255, 0.8);
                          text-align: center;
                          line-height: 40px;
                          font-weight: 700;
                          font-size: 20px;
                          color: #111827;
                          margin-right: 12px;
                        "
                      >
                        R
                      </span>
                      <span
                        style="
                          display: inline-block;
                          vertical-align: middle;
                          font-size: 20px;
                          font-weight: 600;
                          color: #111827;
                        "
                      >
                        Resize Studio
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 16px;">
                      <h1
                        style="
                          margin: 0 0 4px 0;
                          font-size: 24px;
                          font-weight: 600;
                          color: #111827;
                        "
                      >
                        You’ve been invited to Resize Studio
                      </h1>
                      <p
                        style="
                          margin: 0;
                          font-size: 14px;
                          line-height: 1.6;
                          color: #4b5563;
                        "
                      >
                        A team member has invited you to join as an ${roleLabel}.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 28px 32px 8px 32px;">
                <p
                  style="
                    margin: 0 0 16px 0;
                    font-size: 14px;
                    line-height: 1.7;
                    color: #374151;
                  "
                >
                  Hi ${fullName},
                </p>
                <p
                  style="
                    margin: 0 0 16px 0;
                    font-size: 14px;
                    line-height: 1.7;
                    color: #374151;
                  "
                >
                  You’ve been invited to create a user account as an
                  <strong style="color: #111827;">${roleLabelHtml}</strong>.
                </p>

                <p
                  style="
                    margin: 0 0 24px 0;
                    font-size: 14px;
                    line-height: 1.7;
                    color: #374151;
                  "
                >
                  Click the button below to accept your invite and set your password.
                </p>

                <p style="margin: 0 0 32px 0; text-align: left;">
                  <a
                    href="${confirmationUrl}"
                    style="
                      display: inline-block;
                      padding: 12px 24px;
                      border-radius: 999px;
                      background-color: #111827;
                      color: #ffffff;
                      font-size: 14px;
                      font-weight: 600;
                      text-decoration: none;
                      letter-spacing: 0.02em;
                    "
                  >
                    Accept invite &amp; set up account
                  </a>
                </p>

                <p
                  style="
                    margin: 0 0 16px 0;
                    font-size: 12px;
                    line-height: 1.7;
                    color: #6b7280;
                  "
                >
                  If the button above doesn’t work, copy and paste this link into your
                  browser:
                </p>
                <p
                  style="
                    margin: 0 0 24px 0;
                    font-size: 12px;
                    line-height: 1.6;
                    color: #2563eb;
                    word-break: break-all;
                  "
                >
                  <a href="${confirmationUrl}" style="color: #2563eb; text-decoration: underline;">
                    ${confirmationUrlText}
                  </a>
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 24px 32px;">
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px 0;" />
                <p
                  style="
                    margin: 0 0 8px 0;
                    font-size: 11px;
                    line-height: 1.6;
                    color: #9ca3af;
                  "
                >
                  You received this email because an account was created for you on Resize Studio.
                  If you weren’t expecting this, you can safely ignore this message.
                </p>
                <p
                  style="
                    margin: 0;
                    font-size: 11px;
                    line-height: 1.6;
                    color: #9ca3af;
                  "
                >
                  &copy; ${year} Resize Studio. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
