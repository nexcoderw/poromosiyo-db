import 'reflect-metadata';

import { MODULE_METADATA } from '@nestjs/common/constants';

import { DatabasePackageModule } from './database-package.module';
import { PrismaModule } from './prisma/prisma.module';

describe('DatabasePackageModule', () => {
  it('imports the Prisma module', () => {
    const imports =
      Reflect.getMetadata(
        MODULE_METADATA.IMPORTS,
        DatabasePackageModule,
      ) ?? [];

    expect(imports).toContain(PrismaModule);
  });

  it('exports the Prisma module', () => {
    const exports =
      Reflect.getMetadata(
        MODULE_METADATA.EXPORTS,
        DatabasePackageModule,
      ) ?? [];

    expect(exports).toContain(PrismaModule);
  });
});
