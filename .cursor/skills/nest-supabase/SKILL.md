---
name: nest-supabase
description: Use Supabase Auth, Storage, or Realtime from this NestJS app. Use when signing users in, uploading files, subscribing to changes, or talking to Supabase over HTTP (not raw Postgres).
---

# NestJS + Supabase

Supabase is used for **Auth, Storage, and Realtime**. Postgres access goes through TypeORM — see `nest-typeorm`. Do not query app tables through `supabase.from('…')` from the server; that bypasses our transaction and validation boundaries.

## The two clients

`SupabaseService` (`src/supabase/supabase.service.ts`) exposes:

- **`supabase.anon`** — uses the anon key. Respects Row Level Security. Use when acting on behalf of a specific user (pass their JWT via `setSession` / `auth.setAuth`).
- **`supabase.admin`** — uses the `service_role` key. **Bypasses RLS.** Server-side only. Never return this client, its key, or its results directly to a browser.

Rule of thumb: if you're not sure which to use, use `anon` with the caller's JWT. Reach for `admin` only for genuinely server-side operations (creating auth users, admin listings, cron jobs).

## Injecting

```ts
constructor(private readonly supabase: SupabaseService) {}

const { data, error } = await this.supabase.admin.auth.admin.createUser({ … });
if (error) throw new InternalServerErrorException(error.message);
```

Wrap every Supabase call in the pattern above: **destructure `{ data, error }`, throw a Nest HTTP exception on `error`**, then use `data`. Never return raw Supabase errors to the client — they leak internals.

## Isolate Supabase behind a service

Do **not** call `SupabaseService` from a controller or from the orchestrator service. Wrap the calls in a dedicated `<Feature>AuthService` / `<Feature>StorageService` provider — see the `UsersAuthService` example in `src/modules/users/services/`. This keeps mocking easy and lets us swap providers without touching business logic. See `nest-service-separation`.

## Auth patterns

- **Sign-up flow**: create the Supabase auth user first, then insert the app-side `User` row referencing `supabase_auth_id`. If the DB insert fails, **compensate** by deleting the auth user (see `UsersService.create`).
- **Verifying a JWT server-side**: `supabase.auth.getUser(jwt)` — do this in a Nest guard, not in every controller.
- **Never** trust `req.user` claims without verifying the JWT.

## RLS

If a table is accessed by both TypeORM (bypasses RLS via direct Postgres) and Supabase client (subject to RLS), write policies as if the client is untrusted. TypeORM writes are not protected by RLS — enforce authorization at the service layer.

## Environment variables

Required in `.env` (see `.env.example`):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **secret**. Never log, never send to clients, never commit.

Validated on boot by `src/config/env.validation.ts`. Missing keys crash the app at startup by design.

## Anti-patterns

- Using `supabase.admin` in a code path that runs on user input without an authorization check
- Querying app tables with `supabase.from('users').select(...)` — go through TypeORM instead
- Logging `data.session.access_token` or the service role key
- Creating a fresh `createClient(...)` inside a request handler — reuse the singletons from `SupabaseService`
