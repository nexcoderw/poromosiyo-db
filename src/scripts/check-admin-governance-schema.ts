import 'dotenv/config';

import { PrismaService } from '../prisma/prisma.service';

type ColumnRow = {
  tableName: string;
  columnName: string;
};

type RoleColumnRow = {
  columnType: string;
};

type IndexRow = {
  tableName: string;
  indexName: string;
  columnName: string;
  seqInIndex: number | bigint;
};

type ForeignKeyRow = {
  tableName: string;
  columnName: string;
  referencedTableName: string;
  deleteRule: string;
};

const expectedUserColumns = [
  'blocked_at',
  'blocked_reason',
  'blocked_by_user_id',
] as const;

const expectedActivityColumns = [
  'id',
  'subject_user_id',
  'actor_user_id',
  'action',
  'resource_type',
  'resource_id',
  'description',
  'ip_address',
  'user_agent',
  'metadata',
  'created_at',
] as const;

async function main(): Promise<void> {
  process.env.DATABASE_CONNECT_ON_INIT = 'false';

  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const roleRows = await prisma.$queryRaw<RoleColumnRow[]>`
        SELECT
          COLUMN_TYPE AS columnType
        FROM information_schema.COLUMNS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'role'
      `;

    const roleType = roleRows[0]?.columnType ?? '';

    assert(
      roleType.includes("'SUPERADMIN'"),
      'users.role does not include SUPERADMIN.',
    );

    const columns = await prisma.$queryRaw<ColumnRow[]>`
        SELECT
          TABLE_NAME AS tableName,
          COLUMN_NAME AS columnName
        FROM information_schema.COLUMNS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (
            'users',
            'user_activities'
          )
      `;

    const columnKeys = new Set(
      columns.map((row) => `${row.tableName}.${row.columnName}`),
    );

    for (const column of expectedUserColumns) {
      assert(
        columnKeys.has(`users.${column}`),
        `Missing governance column: users.${column}`,
      );
    }

    for (const column of expectedActivityColumns) {
      assert(
        columnKeys.has(`user_activities.${column}`),
        `Missing activity column: user_activities.${column}`,
      );
    }

    const indexes = await prisma.$queryRaw<IndexRow[]>`
        SELECT
          TABLE_NAME AS tableName,
          INDEX_NAME AS indexName,
          COLUMN_NAME AS columnName,
          SEQ_IN_INDEX AS seqInIndex
        FROM information_schema.STATISTICS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (
            'users',
            'user_activities'
          )
        ORDER BY
          TABLE_NAME,
          INDEX_NAME,
          SEQ_IN_INDEX
      `;

    assertIndex(indexes, 'users', ['blocked_at'], 'users blocked-at lookup');

    assertIndex(
      indexes,
      'users',
      ['blocked_by_user_id'],
      'users blocker lookup',
    );

    assertIndex(
      indexes,
      'user_activities',
      ['subject_user_id', 'created_at'],
      'subject activity history',
    );

    assertIndex(
      indexes,
      'user_activities',
      ['actor_user_id', 'created_at'],
      'actor activity history',
    );

    assertIndex(
      indexes,
      'user_activities',
      ['action', 'created_at'],
      'activity action history',
    );

    assertIndex(
      indexes,
      'user_activities',
      ['resource_type', 'resource_id', 'created_at'],
      'resource activity history',
    );

    const foreignKeys = await prisma.$queryRaw<ForeignKeyRow[]>`
        SELECT
          kcu.TABLE_NAME AS tableName,
          kcu.COLUMN_NAME AS columnName,
          kcu.REFERENCED_TABLE_NAME AS referencedTableName,
          rc.DELETE_RULE AS deleteRule
        FROM
          information_schema.KEY_COLUMN_USAGE
          AS kcu
        INNER JOIN
          information_schema.REFERENTIAL_CONSTRAINTS
          AS rc
            ON
              rc.CONSTRAINT_SCHEMA =
                kcu.CONSTRAINT_SCHEMA
              AND rc.CONSTRAINT_NAME =
                kcu.CONSTRAINT_NAME
        WHERE
          kcu.CONSTRAINT_SCHEMA =
            DATABASE()
          AND kcu.REFERENCED_TABLE_NAME
            IS NOT NULL
      `;

    assertForeignKey(
      foreignKeys,
      'users',
      'blocked_by_user_id',
      'users',
      'SET NULL',
    );

    assertForeignKey(
      foreignKeys,
      'user_activities',
      'subject_user_id',
      'users',
      'SET NULL',
    );

    assertForeignKey(
      foreignKeys,
      'user_activities',
      'actor_user_id',
      'users',
      'SET NULL',
    );

    console.log('Poromosiyo admin governance schema verification successful.');

    console.log('Verified UserRole.SUPERADMIN.');

    console.log('Verified user blocking metadata.');

    console.log('Verified persistent user_activities table.');

    console.log('Verified governance activity indexes.');

    console.log('Verified governance SET NULL relationships.');
  } finally {
    await prisma.$disconnect();
  }
}

function assertIndex(
  indexes: readonly IndexRow[],
  table: string,
  columns: readonly string[],
  description: string,
): void {
  const grouped = new Map<string, IndexRow[]>();

  for (const index of indexes) {
    if (index.tableName !== table) {
      continue;
    }

    const rows = grouped.get(index.indexName) ?? [];

    rows.push(index);

    grouped.set(index.indexName, rows);
  }

  for (const rows of grouped.values()) {
    const ordered = [...rows]
      .sort((left, right) => Number(left.seqInIndex) - Number(right.seqInIndex))
      .map((row) => row.columnName);

    if (
      ordered.length >= columns.length &&
      columns.every((column, index) => ordered[index] === column)
    ) {
      return;
    }
  }

  throw new Error(`Missing index for ${description}.`);
}

function assertForeignKey(
  rows: readonly ForeignKeyRow[],
  table: string,
  column: string,
  referencedTable: string,
  deleteRule: string,
): void {
  const found = rows.some(
    (row) =>
      row.tableName === table &&
      row.columnName === column &&
      row.referencedTableName === referencedTable &&
      row.deleteRule === deleteRule,
  );

  assert(found, `Expected ${deleteRule} relationship for ${table}.${column}.`);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error: unknown) => {
  console.error('Poromosiyo admin governance schema verification failed.');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
