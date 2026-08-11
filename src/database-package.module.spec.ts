import 'reflect-metadata';

import { MODULE_METADATA } from '@nestjs/common/constants';

import { DatabasePackageModule } from './database-package.module';
import { PrismaModule } from './prisma/prisma.module';

describe('DatabasePackageModule', () => {
  it('imports the Prisma module', () => {
    const imports: unknown = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      DatabasePackageModule,
    );

    expect(imports).toEqual(expect.arrayContaining([PrismaModule]));
  });

  it('exports the Prisma module', () => {
    const exports: unknown = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      DatabasePackageModule,
    );

    expect(exports).toEqual(expect.arrayContaining([PrismaModule]));
  });
});
