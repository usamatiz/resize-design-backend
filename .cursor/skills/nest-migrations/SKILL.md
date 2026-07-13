---
name: nest-migrations
description: Create, generate, or run TypeORM migrations in this NestJS app. Use when changing the DB schema, adding a table/column/index, backfilling data, or troubleshooting a broken migration.
---

# TypeORM migrations

Schema changes to Postgres (Supabase) go through TypeORM migrations. **Never turn on `synchronize`.** Never edit a migration that has already been run in a shared environment — write a new one that fixes it.

## Commands

Defined in `package.json`. All use the standalone data source at `src/database/data-source.ts` (which loads `.env` via dotenv).

- **Generate from entity diff** — after editing an entity:
  ```sh
  npm run migration:generate -- src/database/migrations/AddWidgetSlug
  ```
- **Create empty** — for data backfills or hand-written SQL:
  ```sh
  npm run migration:create -- src/database/migrations/BackfillWidgetSlugs
  ```
- **Run pending**: `npm run migration:run`
- **Revert last**: `npm run migration:revert`
- **Show status**: `npm run migration:show`

## Authoring rules

1. **File name = `<timestamp>-<PascalName>.ts`** and the class name matches (`AddWidgetSlug1720000000000`). The generator handles this.
2. **Both `up` and `down` must be implemented.** `down` is our escape hatch — don't leave it empty. If the change is truly irreversible (dropping a column with data), say so in a top comment.
3. **Idempotency for extensions and enums**: `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`, `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN null; END $$;` for enums.
4. **Zero-downtime column adds**:
   - Add the column nullable (or with a default) in one migration.
   - Backfill in a second migration if needed.
   - Set `NOT NULL` in a third once the backfill has run in prod.
5. **Renames**: TypeORM will generate `DROP` + `ADD` — that loses data. Convert generated renames into explicit `ALTER TABLE … RENAME COLUMN` before running.
6. **Indexes on large tables**: use `CREATE INDEX CONCURRENTLY` via raw SQL (the `Table*` helpers don't support it):
   ```ts
   await queryRunner.query('CREATE INDEX CONCURRENTLY "IDX_..." ON "widgets" ("slug")');
   ```
   Note: concurrent index builds can't run in a transaction, and `queryRunner` is transactional by default. Move these to a migration that sets `transaction = false` or run them out of band.
7. **Data backfills** in the same migration as the DDL are fine for small tables; for large tables, put the backfill in a separate migration so DDL locks release fast.

## Template

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWidgetSlug1720000000001 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query('ALTER TABLE "widgets" ADD COLUMN "slug" text');
    await qr.query('CREATE UNIQUE INDEX "UQ_widgets_slug" ON "widgets" ("slug")');
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP INDEX "UQ_widgets_slug"');
    await qr.query('ALTER TABLE "widgets" DROP COLUMN "slug"');
  }
}
```

## Supabase specifics

- Our Postgres is behind Supabase's connection pooler. Migrations run fine through it, but some DDL (extensions, roles) may need the **direct** connection string — swap `DB_HOST` to the direct host if you get "must be superuser" errors.
- Do **not** modify tables in the `auth`, `storage`, or `realtime` schemas from a TypeORM migration. Those belong to Supabase and will be clobbered on upgrade.
- Row Level Security policies are best written as raw SQL inside a migration and versioned with the schema. See `nest-supabase` for the RLS threat model.

## When things go wrong

- **"No changes in database schema were found"** during `migration:generate` — usually means the entity file wasn't picked up. Check the `entities` glob in `src/database/data-source.ts`.
- **Migration ran partially and failed** — TypeORM wraps each migration in a transaction, so partial state usually rolls back. If you used raw DDL that can't run in a tx (`CREATE INDEX CONCURRENTLY`), you'll need to clean up manually and retry.
- **Migration marked run but table missing** — the `typeorm_migrations` row exists but the DDL was reverted manually. `DELETE FROM typeorm_migrations WHERE name = '…'` then re-run.

Related: `nest-typeorm` for entity conventions.
