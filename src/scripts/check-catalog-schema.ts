import 'dotenv/config';

import { PrismaService } from '../prisma/prisma.service';

type TableRow = {
  tableName: string;
};

type ColumnRow = {
  tableName: string;
  columnName: string;
};

type DecimalColumnRow = {
  columnName: string;
  numericPrecision: number | bigint | null;
  numericScale: number | bigint | null;
};

type IndexRow = {
  tableName: string;
  indexName: string;
  columnName: string;
  seqInIndex: number | bigint;
  nonUnique: number | bigint;
};

type ForeignKeyRow = {
  tableName: string;
  columnName: string;
  deleteRule: string;
};

type CheckConstraintRow = {
  constraintName: string;
  checkClause: string;
};

const expectedTables = [
  'categories',
  'brands',
  'products',
  'product_images',
] as const;

const expectedColumns:
  Record<string, readonly string[]> = {
    categories: [
      'id',
      'parent_id',
      'name',
      'slug',
      'description',
      'image',
      'is_active',
      'sort_order',
      'created_at',
      'updated_at',
    ],

    brands: [
      'id',
      'name',
      'slug',
      'description',
      'logo',
      'website',
      'is_active',
      'created_at',
      'updated_at',
    ],

    products: [
      'id',
      'category_id',
      'brand_id',
      'name',
      'slug',
      'sku',
      'short_description',
      'description',
      'currency',
      'original_price',
      'selling_price',
      'status',
      'is_featured',
      'published_at',
      'created_at',
      'updated_at',
    ],

    product_images: [
      'id',
      'product_id',
      'url',
      'alt_text',
      'sort_order',
      'is_primary',
      'created_at',
    ],
  };

const expectedUniqueColumns = [
  ['categories', 'slug'],
  ['brands', 'slug'],
  ['products', 'slug'],
  ['products', 'sku'],
] as const;

const expectedForeignKeys = [
  [
    'categories',
    'parent_id',
    'RESTRICT',
  ],
  [
    'products',
    'category_id',
    'RESTRICT',
  ],
  [
    'products',
    'brand_id',
    'SET NULL',
  ],
  [
    'product_images',
    'product_id',
    'CASCADE',
  ],
] as const;

const expectedCheckConstraints = [
  'categories_sort_order_nonnegative_chk',
  'products_original_price_positive_chk',
  'products_selling_price_positive_chk',
  'products_discount_price_chk',
  'product_images_sort_order_nonnegative_chk',
] as const;

async function main(): Promise<void> {
  process.env.DATABASE_CONNECT_ON_INIT =
    'false';

  const prisma =
    new PrismaService();

  try {
    await prisma.$connect();

    const tables =
      await prisma.$queryRaw<
        TableRow[]
      >`
        SELECT
          TABLE_NAME AS tableName
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
      `;

    const tableNames =
      new Set(
        tables.map(
          (row) =>
            row.tableName,
        ),
      );

    for (
      const table
      of expectedTables
    ) {
      assert(
        tableNames.has(table),
        `Missing catalog table: ${table}`,
      );
    }

    const columns =
      await prisma.$queryRaw<
        ColumnRow[]
      >`
        SELECT
          TABLE_NAME AS tableName,
          COLUMN_NAME AS columnName
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
      `;

    const columnKeys =
      new Set(
        columns.map(
          (row) =>
            `${row.tableName}.${row.columnName}`,
        ),
      );

    for (
      const [
        table,
        tableColumns,
      ]
      of Object.entries(
        expectedColumns,
      )
    ) {
      for (
        const column
        of tableColumns
      ) {
        assert(
          columnKeys.has(
            `${table}.${column}`,
          ),
          `Missing catalog column: ${table}.${column}`,
        );
      }
    }

    const decimalColumns =
      await prisma.$queryRaw<
        DecimalColumnRow[]
      >`
        SELECT
          COLUMN_NAME AS columnName,
          NUMERIC_PRECISION AS numericPrecision,
          NUMERIC_SCALE AS numericScale
        FROM information_schema.COLUMNS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND COLUMN_NAME IN (
            'original_price',
            'selling_price'
          )
      `;

    for (
      const column
      of [
        'original_price',
        'selling_price',
      ]
    ) {
      const result =
        decimalColumns.find(
          (row) =>
            row.columnName ===
            column,
        );

      assert(
        result !== undefined,
        `Missing product price column: ${column}`,
      );

      assert(
        Number(
          result.numericPrecision,
        ) === 12,
        `${column} must use DECIMAL(12,2).`,
      );

      assert(
        Number(
          result.numericScale,
        ) === 2,
        `${column} must use DECIMAL(12,2).`,
      );
    }

    const indexes =
      await prisma.$queryRaw<
        IndexRow[]
      >`
        SELECT
          TABLE_NAME AS tableName,
          INDEX_NAME AS indexName,
          COLUMN_NAME AS columnName,
          SEQ_IN_INDEX AS seqInIndex,
          NON_UNIQUE AS nonUnique
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY
          TABLE_NAME,
          INDEX_NAME,
          SEQ_IN_INDEX
      `;

    for (
      const [
        table,
        column,
      ]
      of expectedUniqueColumns
    ) {
      const unique =
        indexes.some(
          (row) =>
            row.tableName ===
              table &&
            row.columnName ===
              column &&
            Number(
              row.nonUnique,
            ) === 0,
        );

      assert(
        unique,
        `Missing catalog unique constraint: ${table}.${column}`,
      );
    }

    const foreignKeys =
      await prisma.$queryRaw<
        ForeignKeyRow[]
      >`
        SELECT
          kcu.TABLE_NAME AS tableName,
          kcu.COLUMN_NAME AS columnName,
          rc.DELETE_RULE AS deleteRule
        FROM information_schema.KEY_COLUMN_USAGE AS kcu
        INNER JOIN
          information_schema.REFERENTIAL_CONSTRAINTS AS rc
            ON rc.CONSTRAINT_SCHEMA =
              kcu.CONSTRAINT_SCHEMA
            AND rc.CONSTRAINT_NAME =
              kcu.CONSTRAINT_NAME
        WHERE
          kcu.CONSTRAINT_SCHEMA =
            DATABASE()
          AND
          kcu.REFERENCED_TABLE_NAME
            IS NOT NULL
      `;

    for (
      const [
        table,
        column,
        deleteRule,
      ]
      of expectedForeignKeys
    ) {
      const found =
        foreignKeys.some(
          (row) =>
            row.tableName ===
              table &&
            row.columnName ===
              column &&
            row.deleteRule ===
              deleteRule,
        );

      assert(
        found,
        `Expected ${deleteRule} for ${table}.${column}`,
      );
    }

    const checks =
      await prisma.$queryRaw<
        CheckConstraintRow[]
      >`
        SELECT
          CONSTRAINT_NAME AS constraintName,
          CHECK_CLAUSE AS checkClause
        FROM information_schema.CHECK_CONSTRAINTS
        WHERE
          CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME IN (
            'categories',
            'products',
            'product_images'
          )
      `;

    const checkNames =
      new Set(
        checks.map(
          (row) =>
            row.constraintName,
        ),
      );

    for (
      const constraint
      of expectedCheckConstraints
    ) {
      assert(
        checkNames.has(
          constraint,
        ),
        `Missing catalog check constraint: ${constraint}`,
      );
    }

    console.log(
      'Poromosiyo catalog schema verification successful.',
    );

    for (
      const table
      of expectedTables
    ) {
      console.log(
        `Verified table: ${table}`,
      );
    }

    console.log(
      'Verified DECIMAL(12,2) product prices.',
    );

    console.log(
      'Verified catalog unique constraints.',
    );

    console.log(
      'Verified catalog foreign-key deletion rules.',
    );

    console.log(
      'Verified discounted-product database constraints.',
    );
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

main().catch(
  (error: unknown) => {
    console.error(
      'Poromosiyo catalog schema verification failed.',
    );

    if (
      error instanceof
      Error
    ) {
      console.error(
        error.message,
      );
    } else {
      console.error(
        String(error),
      );
    }

    process.exitCode = 1;
  },
);
