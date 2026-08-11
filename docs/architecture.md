# Database Architecture

## Runtime Flow

```text
Customer App
      │
      ├────> NestJS API ────> @poromosiyo/db ────> Prisma ────> MySQL
      │
Admin App
```

## Repository Role

This repository has two responsibilities:

1. database governance;
2. reusable database package functionality.

It is not an HTTP application.

## Target Structure

```text
prisma/
├── schema.prisma
└── migrations/

src/
├── prisma/
└── index.ts

docs/
```

This structure will be implemented in the database foundation milestone.

## Dependency Direction

`@poromosiyo/db` must not depend on the NestJS API.

The API depends on the DB package, never the reverse.
