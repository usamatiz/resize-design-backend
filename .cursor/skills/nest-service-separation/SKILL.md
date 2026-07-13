---
name: nest-service-separation
description: Decide how to split a NestJS feature's services when responsibilities differ (persistence, external APIs, business logic). Use when a service is growing, when a class touches both DB and an external client, or when structuring a new feature.
---

# Splitting services by responsibility

Every feature module ships with **one orchestrator service** (business logic) and **one specialized service per distinct collaborator** (DB, auth provider, storage, external API, message broker, …). This is the pattern followed by `src/modules/users/`.

## The default split

```
src/modules/<feature>/
├── entities/                       # TypeORM entities
├── dto/                            # request/response DTOs
├── <feature>.controller.ts         # HTTP boundary — see nest-controllers
├── <feature>.module.ts             # wires everything up
└── services/
    ├── <feature>.service.ts        # orchestrator: rules, workflows, transactions
    ├── <feature>.repository.ts     # DB access (wraps Repository<T>) — see nest-typeorm
    ├── <feature>-auth.service.ts   # Supabase Auth calls — see nest-supabase
    ├── <feature>-storage.service.ts    # (only if the feature uploads files)
    └── <feature>-<external>.service.ts # (per external API: Stripe, Twilio, …)
```

Not every feature needs every specialized service — add them **as responsibilities appear**, not up-front.

## When to split (positive signals)

- The service imports both a `Repository<T>` and `SupabaseService` (or any other external client).
- Two methods have completely different mock surfaces in tests.
- A method's failure mode belongs to a foreign system ("Stripe returned card_declined", "Supabase rate-limited"). That's a signal for a dedicated wrapper.
- You've written the same "map error, wrap in exception, log" pattern for a specific downstream client in three places.

## When NOT to split (negative signals)

- The would-be new service has only one method used in one place. Inline it.
- Splitting would just move code around without changing the mock surface. That's ceremony, not separation.
- The "external system" is another module in the same app. Just inject its orchestrator service.

## Naming

- Persistence wrapper: `<Feature>Repository` (not `<Feature>DbService`)
- Auth wrapper: `<Feature>AuthService`
- Storage wrapper: `<Feature>StorageService`
- External API wrapper: `<Feature><Provider>Service` — e.g. `PaymentsStripeService`, not `PaymentsGatewayService` (be specific about the provider — swaps are rarer than we predict)

## Dependency direction

```
Controller  ──▶  <Feature>Service (orchestrator)
                      │
                      ├──▶ <Feature>Repository        (Postgres via TypeORM)
                      ├──▶ <Feature>AuthService       (Supabase Auth)
                      ├──▶ <Feature>StorageService    (Supabase Storage)
                      └──▶ OtherFeatureService        (cross-feature calls)
```

**Never** the reverse. Specialized services do not know about the orchestrator. If a repository needs to "call back" into business logic, the design is inverted — lift that logic into the orchestrator.

## Module wiring template

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Widget])],
  controllers: [WidgetsController],
  providers: [
    WidgetsService,           // orchestrator
    WidgetsRepository,        // persistence
    WidgetsStripeService,     // external API
  ],
  exports: [WidgetsService],  // only the orchestrator, never internals
})
export class WidgetsModule {}
```

Only export the orchestrator. Repositories and external wrappers are implementation details.

## Concrete example

`src/modules/users/`:

- `UsersController` — HTTP shape
- `UsersService` — coordinates: check duplicates → create auth user → insert row → compensate on failure
- `UsersRepository` — Postgres reads/writes only
- `UsersAuthService` — Supabase `auth.admin` calls, error translation

`UsersService.create` uses both `UsersRepository` and `UsersAuthService`. Neither knows about the other. If Supabase changes their SDK, only `UsersAuthService` moves. If the DB schema changes, only `UsersRepository` and its migration move.

Related: `nest-controllers` · `nest-services` · `nest-typeorm` · `nest-supabase` · `nest-migrations`
