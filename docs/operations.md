# Database Operations Rules

> Status: Foundation

Operational runbooks will expand when staging and production infrastructure
exist.

## Required Principles

- Never experiment on production.
- Test migrations against a safe environment first.
- Keep migration history in source control.
- Verify backup and recovery procedures before destructive changes.
- Investigate drift instead of blindly resetting a database.
- Coordinate schema releases with the API when application code depends on
  the change.
- Prefer backward-compatible rollout sequences for changes spanning multiple
  deployed projects.

## Incident Rule

Emergency database changes must be documented and reconciled with canonical
migration history afterward.
