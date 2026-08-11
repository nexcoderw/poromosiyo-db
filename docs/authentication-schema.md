# Authentication Schema

> Status: Mandatory
> Milestone: 5
> Scope: Authentication tables only

## Purpose

The first Poromosiyo application schema is limited to authentication and
identity-access persistence.

It intentionally does not include ecommerce domain tables.

## Tables

```text
users
  |
  +-- auth_sessions
  |      |
  |      +-- refresh_tokens
  |
  +-- email_verification_tokens
  |
  +-- password_reset_tokens
```
