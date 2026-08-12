import 'dotenv/config';

import { PrismaService } from '../prisma/prisma.service';

type ColumnRow = {
  isNullable: string;
};

type IndexRow = {
  indexName: string;
  columnName: string;
  seqInIndex: number | bigint;
};

type CountRow = {
  count: number | bigint;
};

async function main(): Promise<void> {
  process.env.DATABASE_CONNECT_ON_INIT = 'false';

  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const columns = await prisma.$queryRaw<ColumnRow[]>`
        SELECT
          IS_NULLABLE AS isNullable
        FROM information_schema.COLUMNS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND COLUMN_NAME = 'expires_at'
      `;

    if (columns.length !== 1) {
      throw new Error('products.expires_at is missing.');
    }

    if (columns[0]?.isNullable !== 'NO') {
      throw new Error('products.expires_at must be NOT NULL.');
    }

    const indexes = await prisma.$queryRaw<IndexRow[]>`
        SELECT
          INDEX_NAME AS indexName,
          COLUMN_NAME AS columnName,
          SEQ_IN_INDEX AS seqInIndex
        FROM information_schema.STATISTICS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
        ORDER BY
          INDEX_NAME,
          SEQ_IN_INDEX
      `;

    const grouped = new Map<string, IndexRow[]>();

    for (const row of indexes) {
      const current = grouped.get(row.indexName) ?? [];

      current.push(row);

      grouped.set(row.indexName, current);
    }

    const hasExpirationIndex = [...grouped.values()].some((rows) => {
      const columns = [...rows]
        .sort((a, b) => Number(a.seqInIndex) - Number(b.seqInIndex))
        .map((row) => row.columnName);

      return columns[0] === 'status' && columns[1] === 'expires_at';
    });

    if (!hasExpirationIndex) {
      throw new Error('Missing products(status, expires_at) index.');
    }

    const [unassigned] = await prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS count
        FROM products
        WHERE expires_at IS NULL
      `;

    if (Number(unassigned?.count ?? 0) !== 0) {
      throw new Error('Products without expiration dates still exist.');
    }

    console.log(
      'Poromosiyo product expiration schema verification successful.',
    );

    console.log('Verified required expires_at.');

    console.log('Verified expiration lookup index.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Product expiration schema verification failed.');

  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
});
