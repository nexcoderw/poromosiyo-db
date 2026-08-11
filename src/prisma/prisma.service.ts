import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
      adapter: new PrismaMariaDb(createMariaDbAdapterConfig(databaseUrl)),
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

function createMariaDbAdapterConfig(
  databaseUrl: string,
): ConstructorParameters<typeof PrismaMariaDb>[0] {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid database URL.');
  }

  if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
    throw new Error(
      'DATABASE_URL must use the mysql:// or mariadb:// protocol.',
    );
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

  if (!database) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  const connectionLimit = getConnectionLimit();

  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit,
  };
}

function getConnectionLimit(): number {
  const raw = process.env.DATABASE_CONNECTION_LIMIT ?? '5';
  const value = Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error('DATABASE_CONNECTION_LIMIT must be a positive integer.');
  }

  return value;
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
