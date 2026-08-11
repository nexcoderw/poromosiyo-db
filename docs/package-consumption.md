# Package Consumption Rules

## Package Name

```text
@poromosiyo/db
```

## Approved Consumer

The primary approved application consumer is:

```text
../api
```

The API will eventually reference the sibling package from its
`package.json`.

## Not Allowed

These projects must not import `@poromosiyo/db`:

```text
../../app/app
../../app/admin
```

Browser applications must communicate with the NestJS API instead.

## Package Surface

Export only intentional public APIs through the DB package entry point.

Do not make internal implementation files part of the supported contract by
accident.

## Build Relationship

Once package code exists, the DB package must be buildable before API code
depending on compiled exports is built.

The exact scripts will be introduced during API/DB integration.
