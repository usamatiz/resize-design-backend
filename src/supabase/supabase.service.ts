import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private _anon!: SupabaseClient;
  private _admin!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.getOrThrow<string>('supabase.url');
    const anonKey = this.config.getOrThrow<string>('supabase.anonKey');
    const serviceKey = this.config.getOrThrow<string>(
      'supabase.serviceRoleKey',
    );

    this._anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    this._admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.logger.log('Supabase clients initialized');
  }

  /** Client with anon key — respects Row Level Security. Use for user-scoped calls. */
  get anon(): SupabaseClient {
    return this._anon;
  }

  /** Client with service_role key — bypasses RLS. Server-side only, never expose. */
  get admin(): SupabaseClient {
    return this._admin;
  }
}
