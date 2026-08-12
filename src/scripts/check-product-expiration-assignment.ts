import 'dotenv/config';

import { PrismaService } from '../prisma/prisma.service';

type CountRow = {
  count: number | bigint;
};

async function main(): Promise<void> {
  process.env.DATABASE_CONNECT_ON_INIT = 'false';

  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const [row] = await prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS count
        FROM products
        WHERE expires_at IS NULL
      `;

    const count = Number(row?.count ?? 0);

    if (count !== 0) {
      throw new Error(`${count} product(s) still have no expiration date.`);
    }

    console.log('Every Poromosiyo product has an expiration date.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Product expiration assignment verification failed.');

  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
});
