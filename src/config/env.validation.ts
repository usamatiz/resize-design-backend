import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvVars {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string;

  @IsNumberString()
  @IsOptional()
  PORT?: string;

  @IsString() APP_URL: string;
  @IsString() @IsOptional() INVITE_REDIRECT_PATH?: string;

  @IsString() DATABASE_URL: string;
  @IsBooleanString() @IsOptional() DB_SSL?: string;

  @IsString() SUPABASE_URL: string;
  @IsString() SUPABASE_ANON_KEY: string;
  @IsString() SUPABASE_SERVICE_ROLE_KEY: string;

  @IsString() RESEND_API_KEY: string;
  @IsString() MAIL_FROM: string;

  @IsString() ANTHROPIC_API_KEY: string;
  @IsString() @IsOptional() ANTHROPIC_MODEL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(
      `Invalid environment: ${errors.map((e) => e.toString()).join('; ')}`,
    );
  }
  return validated;
}
