import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL as string,
  ssl:
    process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
}));
