---
name: nest-typeorm
description: Add or modify TypeORM entities, repositories, and DB queries in this NestJS app. Invoke when the user asks to create/change database entities, add a new persisted field, or write a repository query.
---

# NestJS + TypeORM

This project uses **TypeORM v1** against a **Postgres** database (Supabase-hosted). All persistence goes through TypeORM entities + repositories — the Supabase HTTP client is only for Auth / Storage / Realtime.

## Golden rules

1. **`synchronize: false` — always.** Schema changes go through migrations. Never turn on synchronize, not even in dev. See [[nest-migrations]].
2. **Entities live at** `src/modules/<feature>/entities/<name>.entity.ts` and are auto-loaded by `autoLoadEntities: true`.
3. **Never inject `Repository<T>` directly into a controller or an orchestrator service.** Wrap it in a `<Feature>Repository` provider. See [[nest-service-separation]].
4. **Column naming**: entity properties are camelCase; DB columns are snake_case. Set `{ name: 'snake_case' }` explicitly on `@Column`, `@CreateDateColumn`, `@UpdateDateColumn` when they differ.
5. **UUID primary keys**: `@PrimaryGeneratedColumn('uuid')` + a matching `gen_random_uuid()` default in the migration (requires `pgcrypto`).
6. **Timestamps**: use `@CreateDateColumn` / `@UpdateDateColumn` — do not hand-roll `created_at` triggers.
7. **Soft delete**: use `@DeleteDateColumn` + `withDeleted: true` on reads that need archived rows. Don't add a boolean `is_deleted` column.

## Entity template

```ts
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'widgets' })
export class Widget {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  slug: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName: string;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

After adding or changing an entity, **generate a migration** — see [[nest-migrations]].

## Repository wrapper template

```ts
@Injectable()
export class WidgetsRepository {
  constructor(@InjectRepository(Widget) private readonly repo: Repository<Widget>) {}
  findById(id: string) { return this.repo.findOne({ where: { id } }); }
  // ...
}
```

Register in the feature module:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Widget])],
  providers: [WidgetsRepository, WidgetsService],
})
```

## Query guidance

- Prefer `findOne({ where })` / `find({ where, order, take })` over `QueryBuilder` for simple lookups.
- Use `QueryBuilder` when you need joins, subqueries, `RETURNING`, or CTEs.
- Always paginate list endpoints: `take` + `skip` + a stable `order`.
- For batch inserts, use `repo.insert([...])` or the builder — not a loop of `save()`.
- Transactions: use `DataSource.transaction(async (manager) => …)`. Wrap multi-entity writes.

## Anti-patterns to reject

- `synchronize: true`
- `eager: true` on relations (n+1 traps) — load explicitly with `relations: [...]`
- Repository methods inside controllers
- Business logic inside repositories (validation, cross-entity coordination) — that belongs in the orchestrator service. See [[nest-services]].

## Where things live

- Data source: `src/database/data-source.ts`
- Nest wiring: `src/database/database.module.ts`
- Migrations: `src/database/migrations/`
- Entities: `src/modules/<feature>/entities/`
