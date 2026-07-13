# Project: nestjs-app

NestJS 11 + TypeORM 1 + Postgres (Supabase-hosted) + Supabase Auth/Storage.

## Skills

Project-scoped Claude Code skills live in `.claude/skills/`. Invoke the one that fits the task:

- **nest-typeorm** — entities, repositories, queries
- **nest-supabase** — Auth, Storage, Realtime clients
- **nest-migrations** — schema changes & data backfills
- **nest-controllers** — HTTP boundary, DTOs, pipes, guards
- **nest-services** — business logic / orchestrator services
- **nest-service-separation** — how to split a feature's services

## Architecture in one paragraph

Each feature module (`src/modules/<feature>/`) has a controller (HTTP only), an orchestrator `<Feature>Service` (business rules), and one specialized service per collaborator: `<Feature>Repository` for Postgres via TypeORM, `<Feature>AuthService` / `<Feature>StorageService` for Supabase, and `<Feature><Provider>Service` for external APIs. See `src/modules/users/` for the canonical example.

## Postgres vs. Supabase client

Application tables go through **TypeORM**. The Supabase HTTP client is only for Auth, Storage, and Realtime. Do not query app tables via `supabase.from(...)` from the server.

## Env

Copy `.env.example` → `.env` and fill in Supabase DB + API keys. `src/config/env.validation.ts` crashes the app at boot if anything is missing.

## Commands

- `npm run start:dev` — watch mode
- `npm run build` — compile
- `npm run migration:generate -- src/database/migrations/<Name>` — after entity edits
- `npm run migration:run` — apply pending migrations
- `npm run migration:revert` — revert the most recent
