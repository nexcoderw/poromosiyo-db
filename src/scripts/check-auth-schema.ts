import 'dotenv/config';

import { PrismaService } from '../prisma/prisma.service';

type TableRow = {
  tableName: string;
};

type ColumnRow = {
  tableName: string;
  columnName: string;
};

type IndexRow = {
  tableName: string;
  columnName: string;
  nonUnique: number | bigint;
};

type ForeignKeyRow = {
  tableName: string;
  columnName: string;
  deleteRule: string;
};

const expectedTables = [
  'users',
  'auth_sessions',
  'refresh_tokens',
  'email_verification_tokens',
  'password_reset_tokens',
] as const;

const expectedColumns: Record<string, readonly string[]> = {
  users: [
    'id',
    'email',
    'password_hash',
    'role',
    'is_active',
    'email_verified_at',
    'password_changed_at',
    'last_login_at',
    'failed_login_attempts',
    'locked_until',
    'created_at',
    'updated_at',
  ],
  auth_sessions: [
    'id',
    'user_id',
    'user_agent',
    'ip_address',
    'created_at',
    'updated_at',
    'last_seen_at',
    'expires_at',
    'revoked_at',
    'revocation_reason',
  ],
  refresh_tokens: [
    'id',
    'session_id',
    'token_hash',
    'created_at',
    'expires_at',
    'used_at',
    'revoked_at',
  ],
  email_verification_tokens: [
    'id',
    'user_id',
    'email',
    'token_hash',
    'created_at',
    'expires_at',
    'used_at',
    'requester_ip',
    'user_agent',
  ],
  password_reset_tokens: [
    'id',
    'user_id',
    'token_hash',
    'created_at',
    'expires_at',
    'used_at',
    'requester_ip',
    'user_agent',
  ],
};

const expectedUniqueColumns = [
  ['users', 'email'],
  ['refresh_tokens', 'token_hash'],
  ['email_verification_tokens', 'token_hash'],
  ['password_reset_tokens', 'token_hash'],
] as const;

const expectedCascadeForeignKeys = [
  ['auth_sessions', 'user_id'],
  ['refresh_tokens', 'session_id'],
  ['email_verification_tokens', 'user_id'],
  ['password_reset_tokens', 'user_id'],
] as const;

async function main(): Promise<void> {
  process.env.DATABASE_CONNECT_ON_INIT = 'false';

  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const tables = await prisma.$queryRaw<TableRow[]>`
      SELECT
        TABLE_NAME AS tableName
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `;

    const tableNames = new Set(
      tables.map((row) => row.tableName),
    );

    for (const table of expectedTables) {
      assert(
        tableNames.has(table),
        `Missing authentication table: ${table}`,
      );
    }

    const columns = await prisma.$queryRaw<ColumnRow[]>`
      SELECT
        TABLE_NAME AS tableName,
        COLUMN_NAME AS columnName
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
    `;

    const columnKeys = new Set(
      columns.map(
        (row) => `${row.tableName}.${row.columnName}`,
      ),
    );

    for (const [table, tableColumns] of Object.entries(
      expectedColumns,
    )) {
      for (const column of tableColumns) {
        assert(
          columnKeys.has(`${table}.${column}`),
          `Missing authentication column: ${table}.${column}`,
        );
      }
    }

    const indexes = await prisma.$queryRaw<IndexRow[]>`
      SELECT
        TABLE_NAME AS tableName,
        COLUMN_NAME AS columnName,
        NON_UNIQUE AS nonUnique
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
    `;

    for (const [table, column] of expectedUniqueColumns) {
      const hasUniqueIndex = indexes.some(
        (row) =>
          row.tableName === table &&
          row.columnName === column &&
          Number(row.nonUnique) === 0,
      );

      assert(
        hasUniqueIndex,
        `Missing unique constraint: ${table}.${column}`,
      );
    }

    const foreignKeys = await prisma.$queryRaw<ForeignKeyRow[]>`
      SELECT
        kcu.TABLE_NAME AS tableName,
        kcu.COLUMN_NAME AS columnName,
        rc.DELETE_RULE AS deleteRule
      FROM information_schema.KEY_COLUMN_USAGE AS kcu
      INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc
        ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      WHERE
        kcu.CONSTRAINT_SCHEMA = DATABASE()
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `;

    for (const [table, column] of expectedCascadeForeignKeys) {
      const hasCascade = foreignKeys.some(
        (row) =>
          row.tableName === table &&
          row.columnName === column &&
          row.deleteRule === 'CASCADE',
      );

      assert(
        hasCascade,
        `Expected ON DELETE CASCADE for ${table}.${column}`,
      );
    }

    console.log(
      'Poromosiyo authentication schema verification successful.',
    );

    for (const table of expectedTables) {
      console.log(`Verified table: ${table}`);
    }

    console.log('Verified unique authentication identifiers.');
    console.log('Verified authentication cascade relationships.');
  } finally {
    await prisma.$disconnect();
  }
}

function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error: unknown) => {
  console.error(
    'Poromosiyo authentication schema verification failed.',
  );

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
