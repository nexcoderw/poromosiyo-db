# Admin Governance Schema

> Status: Milestone 14
> Scope: Database foundation for administration and audit history

## Purpose

Milestone 14 introduces the persistence required for:

- SUPERADMIN authority;
- customer blocking;
- admin blocking;
- identifying who blocked an account;
- persistent customer/admin activity history;
- persistent catalog/admin audit events.

It does not introduce HTTP endpoints.

## Roles

The database role set becomes:

```text
CUSTOMER
ADMIN
SUPERADMIN
```
