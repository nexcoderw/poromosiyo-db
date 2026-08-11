import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl =
      process.env.DATABASE_URL ??
      (process.env.NODE_ENV === 'test'
        ? 'mysql://root@localhost:3306/poromosiyo'
        : '');

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is required for the Poromosiyo database package.',
      );
    }

    super({
      adapter: new PrismaMariaDb(toMariaDbAdapterUrl(databaseUrl)),
    });
  }

  async onModuleInit(): Promise<void> {
    if (shouldSkipInitialConnection()) {
      return;
    }

    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

function shouldTreatAsTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test';
}

function shouldConnectOnInit(): boolean {
  return process.env.DATABASE_CONNECT_ON_INIT !== 'false';
}

function shouldSkipInitialConnection(): boolean {
  return (
    !shouldConnectOnInit() ||
    (shouldTreatAsTestEnvironment() &&
      process.env.DATABASE_CONNECT_ON_INIT !== 'true')
  );
}

function toMariaDbAdapterUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);

  if (url.protocol === 'mysql:') {
    url.protocol = 'mariadb:';
  }

  return url.toString();
}
