---
name: nest-services
description: Write or modify the business-logic (orchestrator) service in a NestJS feature module. Use when adding a workflow, enforcing a rule, coordinating DB + external calls, or handling transactions.
---

# NestJS services (business logic)

The orchestrator service (`<Feature>Service`) is where **business rules and workflows live**. It sits between the controller (see `nest-controllers`) and the specialized services (repository, auth, storage, external APIs) — see `nest-service-separation`.

## Shape

```ts
@Injectable()
export class WidgetsService {
  constructor(
    private readonly widgetsRepo: WidgetsRepository,
    private readonly widgetsSearch: WidgetsSearchService,
    private readonly notifier: NotificationService,
  ) {}

  async publish(id: string, actor: User): Promise<Widget> {
    const widget = await this.widgetsRepo.findById(id);
    if (!widget) throw new NotFoundException(`Widget ${id} not found`);
    if (widget.status === 'published') throw new ConflictException('Already published');
    if (!this.canPublish(actor, widget)) throw new ForbiddenException();

    const updated = await this.widgetsRepo.update(id, { status: 'published', publishedAt: new Date() });
    await this.widgetsSearch.index(updated!);
    await this.notifier.notifySubscribers(updated!);
    return updated!;
  }
}
```

## What belongs here

- Authorization checks that need domain state (`canPublish(actor, widget)`)
- Invariants and rules (`if (widget.status === 'published') throw ConflictException`)
- Coordination between two or more collaborators (repo + search + notifier)
- Transaction boundaries
- Compensating actions when a downstream call fails (see the Supabase rollback in `UsersService.create`)
- Translating "not found" into `NotFoundException`, "duplicate" into `ConflictException`, etc.

## What does NOT belong here

- Raw SQL or `Repository<T>` calls — go through the repository service. See `nest-typeorm`.
- Direct `SupabaseService` calls — wrap in `<Feature>AuthService` / `<Feature>StorageService`. See `nest-supabase`.
- Request/response shaping — that's the controller's job.
- Validation of input format (email shape, string length) — DTOs handle that.

## Exception vocabulary

Use Nest's built-ins so controllers don't need `try/catch`:

| Situation                          | Throw                        |
|------------------------------------|------------------------------|
| Entity not found                   | `NotFoundException`          |
| Uniqueness violation, wrong state  | `ConflictException`          |
| Caller lacks permission            | `ForbiddenException`         |
| Caller isn't authenticated         | `UnauthorizedException`      |
| Input semantically wrong           | `BadRequestException`        |
| Downstream failure we own          | `InternalServerErrorException` (log the cause) |

Do **not** re-throw `Error` from a downstream client — wrap it. Never leak Supabase error messages or SQL error text to the client.

## Transactions

Use `DataSource.transaction` for multi-write flows:

```ts
constructor(private readonly dataSource: DataSource) {}

async transfer(fromId: string, toId: string, amount: number) {
  return this.dataSource.transaction(async (manager) => {
    const from = await manager.findOneOrFail(Account, { where: { id: fromId } });
    const to = await manager.findOneOrFail(Account, { where: { id: toId } });
    if (from.balance < amount) throw new ConflictException('Insufficient funds');
    await manager.update(Account, fromId, { balance: from.balance - amount });
    await manager.update(Account, toId, { balance: to.balance + amount });
  });
}
```

Note: when you're inside a transaction, use the passed-in `manager`, not the injected repositories — otherwise those calls run outside the transaction.

## Idempotency

For any endpoint that creates external side effects (payments, emails, auth users), design for retries: accept an idempotency key, or check "already done" state before doing the work.

## Testing

Because the orchestrator only depends on other services (never on `Repository<T>` or `SupabaseService` directly), unit tests can mock those collaborators with plain Jest mocks. No test DB, no `@nestjs/testing` module — just `new WidgetsService(mockRepo, mockSearch, mockNotifier)`.

Related: `nest-controllers` · `nest-service-separation` · `nest-typeorm` · `nest-supabase`
