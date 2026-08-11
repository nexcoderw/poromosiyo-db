# Poromosiyo DB Agent Instructions

This file is the mandatory entry point for AI agents working in the
Poromosiyo database repository.

## Mandatory Reading

Read before every task:

1. `docs/project-overview.md`
2. `docs/git.md`
3. the relevant task-specific document

## Documentation Router

| Task | Required documents |
| --- | --- |
| Understand the project | `README.md`, `docs/architecture.md` |
| Prisma schema changes | `docs/database-migrations.md`, `docs/security.md` |
| Package exports | `docs/package-consumption.md`, `docs/architecture.md` |
| Environment or credentials | `docs/environment.md`, `docs/security.md` |
| Tests and validation | `docs/testing-quality.md` |
| Database operations | `docs/operations.md`, `docs/database-migrations.md` |
| CI | `docs/ci.md`, `docs/testing-quality.md` |

## Non-Negotiable Rules

- This repository is the single owner of Poromosiyo database structure.
- Prisma schema changes originate here.
- Migrations originate here.
- Tables, columns, indexes, constraints, relations, defaults, and nullability
  changes originate here.
- Other Poromosiyo projects must not maintain competing Prisma schemas.
- The API will consume this project as `@poromosiyo/db`.
- This project is not an HTTP server.
- Frontend projects must never import this package.
- Never run destructive database operations without understanding impact,
  backup strategy, and rollback/recovery.
- Never commit credentials or database dumps.
- Never revert unrelated changes.

## Foundation State

Prisma is intentionally not configured during Milestone 2.

Do not create schema or migration files until the database foundation
milestone begins.
