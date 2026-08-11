import 'dotenv/config';

import { PrismaService } from '../prisma/prisma.service';

type DatabaseProbe = {
  databaseName: string | null;
  databaseVersion: string;
  characterSet: string;
  collation: string;
};

async function main(): Promise<void> {
  process.env.DATABASE_CONNECT_ON_INIT = 'false';

  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const rows = await prisma.$queryRaw<DatabaseProbe[]>`
      SELECT
        DATABASE() AS databaseName,
        VERSION() AS databaseVersion,
        @@character_set_database AS characterSet,
        @@collation_database AS collation
    `;

    const database = rows[0];

    if (!database?.databaseName) {
      throw new Error('Connected to MySQL but no database is selected.');
    }

    console.log('Poromosiyo database connection successful.');
    console.log(`Database: ${database.databaseName}`);
    console.log(`MySQL version: ${database.databaseVersion}`);
    console.log(`Character set: ${database.characterSet}`);
    console.log(`Collation: ${database.collation}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Poromosiyo database connection failed.');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
