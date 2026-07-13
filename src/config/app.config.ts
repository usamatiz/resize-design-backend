import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  url: process.env.APP_URL as string,
  apiUrl: process.env.API_URL as string,
  inviteRedirectPath: process.env.INVITE_REDIRECT_PATH ?? '/auth/set-password',
  inviteSetupSecret: process.env.INVITE_SETUP_SECRET as string,
}));
