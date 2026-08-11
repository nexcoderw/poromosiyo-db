# Database Security Rules

> Status: Mandatory

## Credentials

Never commit:

- `DATABASE_URL`;
- database usernames;
- database passwords;
- database certificates;
- database dumps containing real data.

`.env.example` must contain placeholders only.

## Access

Use separate credentials for development, test, staging, and production.

Production credentials should have only the permissions required by their
runtime or migration role.

## Data Handling

Do not copy production customer or payment-related data into development
environments without an explicitly approved sanitization process.

## Destructive Operations

Before destructive schema or data operations:

- understand the affected data;
- verify backup/recovery options;
- verify migration history;
- verify downstream application impact;
- establish rollback or forward-recovery steps.

## Frontend Boundary

Database credentials must never appear in customer or admin frontend
environment variables.
