# Database Migration Rules

> Status: Mandatory

## Ownership

All Poromosiyo schema changes originate in this repository.

Never create migration files from:

```text
../api
../../app/app
../../app/admin
```

## Before a Schema Change

Understand:

- current schema state;
- migration history;
- affected tables;
- existing data;
- API impact;
- customer-app impact;
- admin-app impact;
- rollback/recovery strategy.

## Development Workflow

Once Prisma is configured, development schema changes must:

1. update `prisma/schema.prisma`;
2. format and validate the schema;
3. generate a named migration;
4. inspect generated SQL;
5. test against a safe development database;
6. update affected package/API tests;
7. commit schema and migration history together as required by the chosen
   change plan.

## Production

Never use development migration commands against production.

Production/staging migration application must use the approved deployment
workflow.

## Destructive Changes

Renames, drops, type narrowing, destructive constraint changes, and required
columns on populated tables require an explicit migration strategy.

Do not assume generated SQL is safe.

## No Schema Bypass

Do not use ad-hoc production SQL as a substitute for versioned migration
history except during an explicitly reviewed incident procedure.
