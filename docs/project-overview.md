# Project Overview

Poromosiyo DB owns the structure and migration lifecycle of the Poromosiyo
database.

## Single-Owner Rule

All structural database changes originate in this repository.

This includes:

- tables;
- columns;
- relations;
- indexes;
- unique constraints;
- foreign keys;
- enums;
- defaults;
- nullability;
- migration SQL.

## Consumers

Approved runtime consumer:

```text
../api
```

Package:

```text
@poromosiyo/db
```

Frontend applications are not database consumers.

## Product Scope

Future schema work will support the discounted-products ecommerce domain.

The schema itself will be designed in the dedicated ecommerce schema
milestone rather than during documentation setup.
