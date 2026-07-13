---
name: nest-controllers
description: Add or modify a NestJS controller (HTTP endpoints, DTOs, pipes, guards). Invoke when the user asks to expose a new route, accept a request body, add query params, or wire authentication onto a controller.
---

# NestJS controllers

Controllers are the **HTTP boundary — nothing else**. Their job is to accept a request, validate it, delegate to a service, and shape the response. No business rules, no DB access, no cross-service coordination. Those live in services — see [[nest-services]] and [[nest-service-separation]].

## The shape of a controller

```ts
@Controller('widgets')
export class WidgetsController {
  constructor(private readonly widgets: WidgetsService) {}

  @Post()
  create(@Body() dto: CreateWidgetDto): Promise<Widget> {
    return this.widgets.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Widget> {
    return this.widgets.findOne(id);
  }
}
```

Every method body should be **one line** — a delegation to the service. If you find yourself writing an `if` in a controller, move it into the service.

## Rules

1. **DTOs, not `any`.** Every `@Body()` / `@Query()` uses a class-validator DTO in `dto/`. The global `ValidationPipe` (see `src/main.ts`) strips unknown fields (`whitelist: true`) and rejects unknown fields (`forbidNonWhitelisted: true`).
2. **Type params with pipes.** Route params get `ParseUUIDPipe`, `ParseIntPipe`, `ParseBoolPipe`, or `ParseEnumPipe` as appropriate — don't parse manually.
3. **Return domain objects, not raw DB rows** when they contain sensitive fields (`password_hash`, tokens). Serialize with `class-transformer` `@Exclude()` on the entity or map in the service.
4. **HTTP semantics**: `@HttpCode(204)` on delete, `@HttpCode(201)` (default on `@Post`) on create. Use `@Header('Cache-Control', 'no-store')` when returning auth tokens.
5. **Never inject a `Repository<T>` or `SupabaseService` into a controller.** Only inject the feature's orchestrator service.
6. **Guards over inline auth checks.** Auth goes in an `@UseGuards(JwtAuthGuard)` decorator, not `if (!req.user) throw`.
7. **No `try/catch` for HTTP status translation.** Services throw `NotFoundException` / `ConflictException` etc.; Nest converts them.

## Common endpoints

| Verb   | Route          | Method name | Returns   | Status |
|--------|----------------|-------------|-----------|--------|
| POST   | `/widgets`     | `create`    | `Widget`  | 201    |
| GET    | `/widgets`     | `findAll`   | `Widget[]`| 200    |
| GET    | `/widgets/:id` | `findOne`   | `Widget`  | 200    |
| PATCH  | `/widgets/:id` | `update`    | `Widget`  | 200    |
| DELETE | `/widgets/:id` | `remove`    | `void`    | 204    |

Deviations are fine, but justify them.

## DTO conventions

- One file per DTO: `create-widget.dto.ts`, `update-widget.dto.ts`, `list-widgets.query.ts`.
- Use `PartialType(CreateWidgetDto)` from `@nestjs/mapped-types` for updates when it fits.
- Validation lives on the DTO (`@IsEmail`, `@IsUUID`, `@MinLength`), **not** in the controller or service.
- For list endpoints, put pagination + filters in a query DTO with numeric transforms (`@Type(() => Number)` or the global `enableImplicitConversion: true`).

## Pagination shape

```ts
class ListWidgetsQuery {
  @IsOptional() @IsInt() @Min(1) page: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) pageSize: number = 20;
}
```

Return `{ items: T[], total: number, page, pageSize }` — clients need `total` to render pagers.

## Anti-patterns

- Repository injection into a controller
- Business logic in a controller (`if (widget.status === 'draft' && !user.isAdmin)`)
- Manual `throw new HttpException(400, …)` for validation — the pipe does it
- Returning `res.status(200).json(...)` — use return values, let Nest handle the response

Related: [[nest-services]] · [[nest-service-separation]] · [[nest-typeorm]]
