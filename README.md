# Poromosiyo DB

Database package and database-governance repository for Poromosiyo.

## Purpose

This repository will be the single source of truth for:

- Prisma schema;
- MySQL migrations;
- generated Prisma types;
- Prisma client lifecycle;
- approved database-facing package exports;
- schema-change procedures.

## Package

```text
@poromosiyo/db
```

The NestJS API lives at:

```text
../api
```

and will consume this package directly.

The database project is not a standalone HTTP service.

## Runtime

```text
Node.js 24.19.0
npm     11.17.0
```

## Current Status

Milestone 2 establishes governance only.

Prisma, MySQL connectivity, schema creation, and migrations will be added in
later database milestones.

## Documentation

Read:

```text
AGENTS.md
docs/README.md
docs/database-migrations.md
docs/package-consumption.md
```
