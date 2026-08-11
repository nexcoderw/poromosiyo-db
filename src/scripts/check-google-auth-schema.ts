import 'dotenv/config';

import { PrismaService } from '../prisma/prisma.service';

type ColumnRow = {
  characterMaximumLength: number | bigint | null;
};

type IndexRow = {
  indexName: string;
  columnName: string;
  seqInIndex: number | bigint;
  nonUnique: number | bigint;
};

async function main(): Promise<void> {
  process.env.DATABASE_CONNECT_ON_INIT = 'false';

  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const columns = await prisma.$queryRaw<ColumnRow[]>`
        SELECT
          CHARACTER_MAXIMUM_LENGTH
            AS characterMaximumLength
        FROM information_schema.COLUMNS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'auth_accounts'
          AND COLUMN_NAME =
            'provider_account_id'
      `;

    const maximumLength = columns[0]?.characterMaximumLength;

    if (
      maximumLength === null ||
      maximumLength === undefined ||
      Number(maximumLength) !== 255
    ) {
      throw new Error(
        'auth_accounts.provider_account_id must be VARCHAR(255).',
      );
    }

    const indexes = await prisma.$queryRaw<IndexRow[]>`
        SELECT
          INDEX_NAME AS indexName,
          COLUMN_NAME AS columnName,
          SEQ_IN_INDEX AS seqInIndex,
          NON_UNIQUE AS nonUnique
        FROM information_schema.STATISTICS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'auth_accounts'
        ORDER BY
          INDEX_NAME,
          SEQ_IN_INDEX
      `;

    assertUniqueIndex(
      indexes,
      ['provider', 'provider_account_id'],
      'Google provider account identity',
    );

    assertUniqueIndex(
      indexes,
      ['user_id', 'provider'],
      'single provider account per user',
    );

    console.log(
      'Poromosiyo Google authentication schema verification successful.',
    );

    console.log(
      'Verified provider_account_id supports Google subject identifiers.',
    );

    console.log('Verified Google provider identity uniqueness.');

    console.log('Verified one provider identity per user.');
  } finally {
    await prisma.$disconnect();
  }
}

function assertUniqueIndex(
  rows: readonly IndexRow[],
  expectedColumns: readonly string[],
  description: string,
): void {
  const grouped = new Map<string, IndexRow[]>();

  for (const row of rows) {
    if (Number(row.nonUnique) !== 0) {
      continue;
    }

    const indexRows = grouped.get(row.indexName) ?? [];

    indexRows.push(row);

    grouped.set(row.indexName, indexRows);
  }

  for (const indexRows of grouped.values()) {
    const columns = [...indexRows]
      .sort((left, right) => Number(left.seqInIndex) - Number(right.seqInIndex))
      .map((row) => row.columnName);

    if (
      columns.length === expectedColumns.length &&
      columns.every((column, index) => column === expectedColumns[index])
    ) {
      return;
    }
  }

  throw new Error(`Missing unique constraint for ${description}.`);
}

main().catch((error: unknown) => {
  console.error('Poromosiyo Google authentication schema verification failed.');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
