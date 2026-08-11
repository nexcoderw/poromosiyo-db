python3 <<'PY'
from pathlib import Path
import json
import re

ROOT = Path.cwd()

required = [
    ROOT / "package.json",
    ROOT / "prisma/schema.prisma",
    ROOT / "src/prisma/prisma.service.ts",
]

missing = [
    str(path)
    for path in required
    if not path.exists()
]

if missing:
    print("ERROR: Poromosiyo DB foundation is incomplete.")
    for item in missing:
        print(f"  - {item}")
    raise SystemExit(1)


def write(path: str, content: str):
    target = ROOT / path
    target.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    target.write_text(
        content.strip() + "\n",
        encoding="utf-8",
    )
    print(f"Created/updated: {path}")


def append_section(
    path: str,
    marker: str,
    content: str,
):
    target = ROOT / path

    if not target.exists():
        return

    existing = target.read_text(
        encoding="utf-8",
    )

    if marker in existing:
        print(f"Already documented: {path}")
        return

    target.write_text(
        existing.rstrip()
        + "\n\n"
        + content.strip()
        + "\n",
        encoding="utf-8",
    )

    print(f"Updated: {path}")


# ------------------------------------------------------------
# package.json
# ------------------------------------------------------------

package_path = ROOT / "package.json"

pkg = json.loads(
    package_path.read_text(
        encoding="utf-8",
    )
)

scripts = pkg.setdefault(
    "scripts",
    {},
)

scripts["db:governance-check"] = (
    "npm run prisma:generate && "
    "ts-node src/scripts/check-admin-governance-schema.ts"
)

checks = [
    "npm run ci:check",
    "npm run migrate:status",
    "npm run db:check",
    "npm run db:auth-check",
]

if (
    "db:google-auth-check"
    in scripts
):
    checks.append(
        "npm run db:google-auth-check"
    )

if (
    "db:catalog-check"
    in scripts
):
    checks.append(
        "npm run db:catalog-check"
    )

checks.append(
    "npm run db:governance-check"
)

scripts["milestone:14:check"] = (
    " && ".join(checks)
)

package_path.write_text(
    json.dumps(
        pkg,
        indent=2,
    ) + "\n",
    encoding="utf-8",
)

print("Updated: package.json")


# ------------------------------------------------------------
# prisma/schema.prisma
# ------------------------------------------------------------

schema_path = ROOT / "prisma/schema.prisma"

schema = schema_path.read_text(
    encoding="utf-8",
)


# Add SUPERADMIN safely.
role_match = re.search(
    r"enum UserRole\s*\{(?P<body>.*?)\n\}",
    schema,
    flags=re.S,
)

if not role_match:
    raise SystemExit(
        "ERROR: Could not locate UserRole enum."
    )

role_block = role_match.group(0)

if "SUPERADMIN" not in role_block:
    if re.search(
        r"^\s*ADMIN\s*$",
        role_block,
        flags=re.M,
    ):
        updated_role_block = re.sub(
            r"(^\s*ADMIN\s*$)",
            r"\1\n  SUPERADMIN",
            role_block,
            count=1,
            flags=re.M,
        )
    else:
        updated_role_block = (
            role_block[:-1]
            + "  SUPERADMIN\n}"
        )

    schema = schema.replace(
        role_block,
        updated_role_block,
        1,
    )

    print(
        "Added UserRole.SUPERADMIN"
    )
else:
    print(
        "UserRole.SUPERADMIN already exists"
    )


# Locate User model.
user_match = re.search(
    r"model User\s*\{.*?\n\}",
    schema,
    flags=re.S,
)

if not user_match:
    raise SystemExit(
        "ERROR: Could not locate User model."
    )

user_block = user_match.group(0)


# Add blocking scalar fields.
if "blockedAt" not in user_block:
    anchor = (
        "  isActive            Boolean   "
        "@default(true) @map(\"is_active\")"
    )

    if anchor not in user_block:
        raise SystemExit(
            "ERROR: Could not locate User.isActive."
        )

    user_block = user_block.replace(
        anchor,
        anchor
        + "\n"
        + '  blockedAt           DateTime? @map("blocked_at") @db.DateTime(6)\n'
        + '  blockedReason       String?   @map("blocked_reason") @db.VarChar(500)\n'
        + '  blockedByUserId     String?   @map("blocked_by_user_id") @db.Char(36)',
        1,
    )


# Add relations.
if "blockedBy" not in user_block:
    anchor = (
        "  passwordResetTokens     "
        "PasswordResetToken[]"
    )

    if anchor not in user_block:
        raise SystemExit(
            "ERROR: Could not locate User relation anchor."
        )

    user_block = user_block.replace(
        anchor,
        anchor
        + "\n"
        + '\n'
        + '  blockedBy            User?          @relation("UserBlockActor", fields: [blockedByUserId], references: [id], onDelete: SetNull)\n'
        + '  blockedUsers         User[]         @relation("UserBlockActor")\n'
        + '  activities           UserActivity[] @relation("ActivitySubject")\n'
        + '  performedActivities  UserActivity[] @relation("ActivityActor")',
        1,
    )


# Add governance indexes.
if (
    "users_blocked_at_idx"
    not in user_block
):
    anchor = (
        '  @@index([createdAt], '
        'map: "users_created_at_idx")'
    )

    if anchor not in user_block:
        raise SystemExit(
            "ERROR: Could not locate User index anchor."
        )

    user_block = user_block.replace(
        anchor,
        anchor
        + "\n"
        + '  @@index([blockedAt], map: "users_blocked_at_idx")\n'
        + '  @@index([blockedByUserId], map: "users_blocked_by_user_id_idx")',
        1,
    )

schema = schema.replace(
    user_match.group(0),
    user_block,
    1,
)


# Add persistent activity model.
if "model UserActivity {" not in schema:
    activity_model = r'''
model UserActivity {
  id            String   @id @default(uuid()) @db.Char(36)
  subjectUserId String?  @map("subject_user_id") @db.Char(36)
  actorUserId   String?  @map("actor_user_id") @db.Char(36)
  action        String   @db.VarChar(100)
  resourceType  String?  @map("resource_type") @db.VarChar(64)
  resourceId    String?  @map("resource_id") @db.Char(36)
  description   String?  @db.VarChar(500)
  ipAddress     String?  @map("ip_address") @db.VarChar(45)
  userAgent     String?  @map("user_agent") @db.VarChar(255)
  metadata      Json?
  createdAt     DateTime @default(now()) @map("created_at") @db.DateTime(6)

  subjectUser User? @relation("ActivitySubject", fields: [subjectUserId], references: [id], onDelete: SetNull)
  actorUser   User? @relation("ActivityActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([subjectUserId, createdAt], map: "user_activities_subject_created_idx")
  @@index([actorUserId, createdAt], map: "user_activities_actor_created_idx")
  @@index([action, createdAt], map: "user_activities_action_created_idx")
  @@index([resourceType, resourceId, createdAt], map: "user_activities_resource_created_idx")
  @@index([createdAt], map: "user_activities_created_at_idx")
  @@map("user_activities")
}
'''

    if "enum ProductStatus {" in schema:
        schema = schema.replace(
            "enum ProductStatus {",
            activity_model.strip()
            + "\n\n"
            + "enum ProductStatus {",
            1,
        )
    else:
        schema += (
            "\n\n"
            + activity_model.strip()
            + "\n"
        )

    print(
        "Added UserActivity model"
    )
else:
    print(
        "UserActivity model already exists"
    )


schema_path.write_text(
    schema.rstrip() + "\n",
    encoding="utf-8",
)

print("Updated: prisma/schema.prisma")


# ------------------------------------------------------------
# Live governance checker
# ------------------------------------------------------------

write(
    "src/scripts/check-admin-governance-schema.ts",
    r'''
import 'dotenv/config';

import {
  PrismaService,
} from '../prisma/prisma.service';

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
  seqInIndex:
    | number
    | bigint;
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

async function main():
  Promise<void> {
  process.env.DATABASE_CONNECT_ON_INIT =
    'false';

  const prisma =
    new PrismaService();

  try {
    await prisma.$connect();

    const roleRows =
      await prisma.$queryRaw<
        RoleColumnRow[]
      >`
        SELECT
          COLUMN_TYPE AS columnType
        FROM information_schema.COLUMNS
        WHERE
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'role'
      `;

    const roleType =
      roleRows[0]
        ?.columnType ?? '';

    assert(
      roleType.includes(
        "'SUPERADMIN'",
      ),
      'users.role does not include SUPERADMIN.',
    );

    const columns =
      await prisma.$queryRaw<
        ColumnRow[]
      >`
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

    const columnKeys =
      new Set(
        columns.map(
          (row) =>
            `${row.tableName}.${row.columnName}`,
        ),
      );

    for (
      const column
      of expectedUserColumns
    ) {
      assert(
        columnKeys.has(
          `users.${column}`,
        ),
        `Missing governance column: users.${column}`,
      );
    }

    for (
      const column
      of expectedActivityColumns
    ) {
      assert(
        columnKeys.has(
          `user_activities.${column}`,
        ),
        `Missing activity column: user_activities.${column}`,
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

    assertIndex(
      indexes,
      'users',
      [
        'blocked_at',
      ],
      'users blocked-at lookup',
    );

    assertIndex(
      indexes,
      'users',
      [
        'blocked_by_user_id',
      ],
      'users blocker lookup',
    );

    assertIndex(
      indexes,
      'user_activities',
      [
        'subject_user_id',
        'created_at',
      ],
      'subject activity history',
    );

    assertIndex(
      indexes,
      'user_activities',
      [
        'actor_user_id',
        'created_at',
      ],
      'actor activity history',
    );

    assertIndex(
      indexes,
      'user_activities',
      [
        'action',
        'created_at',
      ],
      'activity action history',
    );

    assertIndex(
      indexes,
      'user_activities',
      [
        'resource_type',
        'resource_id',
        'created_at',
      ],
      'resource activity history',
    );

    const foreignKeys =
      await prisma.$queryRaw<
        ForeignKeyRow[]
      >`
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

    console.log(
      'Poromosiyo admin governance schema verification successful.',
    );

    console.log(
      'Verified UserRole.SUPERADMIN.',
    );

    console.log(
      'Verified user blocking metadata.',
    );

    console.log(
      'Verified persistent user_activities table.',
    );

    console.log(
      'Verified governance activity indexes.',
    );

    console.log(
      'Verified governance SET NULL relationships.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

function assertIndex(
  indexes:
    readonly IndexRow[],
  table: string,
  columns:
    readonly string[],
  description: string,
): void {
  const grouped =
    new Map<
      string,
      IndexRow[]
    >();

  for (
    const index
    of indexes
  ) {
    if (
      index.tableName !==
      table
    ) {
      continue;
    }

    const rows =
      grouped.get(
        index.indexName,
      ) ?? [];

    rows.push(index);

    grouped.set(
      index.indexName,
      rows,
    );
  }

  for (
    const rows
    of grouped.values()
  ) {
    const ordered =
      [...rows]
        .sort(
          (left, right) =>
            Number(
              left.seqInIndex,
            ) -
            Number(
              right.seqInIndex,
            ),
        )
        .map(
          (row) =>
            row.columnName,
        );

    if (
      ordered.length >=
        columns.length &&
      columns.every(
        (column, index) =>
          ordered[index] ===
          column,
      )
    ) {
      return;
    }
  }

  throw new Error(
    `Missing index for ${description}.`,
  );
}

function assertForeignKey(
  rows:
    readonly ForeignKeyRow[],
  table: string,
  column: string,
  referencedTable: string,
  deleteRule: string,
): void {
  const found =
    rows.some(
      (row) =>
        row.tableName ===
          table &&
        row.columnName ===
          column &&
        row.referencedTableName ===
          referencedTable &&
        row.deleteRule ===
          deleteRule,
    );

  assert(
    found,
    `Expected ${deleteRule} relationship for ${table}.${column}.`,
  );
}

function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

main().catch(
  (error: unknown) => {
    console.error(
      'Poromosiyo admin governance schema verification failed.',
    );

    if (
      error instanceof Error
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
'''
)


# ------------------------------------------------------------
# Documentation
# ------------------------------------------------------------

write(
    "docs/admin-governance-schema.md",
    r'''
# Admin Governance Schema

> Status: Milestone 14
> Scope: Database foundation for administration and audit history

## Purpose

Milestone 14 introduces the persistence required for:

- SUPERADMIN authority;
- customer blocking;
- admin blocking;
- identifying who blocked an account;
- persistent customer/admin activity history;
- persistent catalog/admin audit events.

It does not introduce HTTP endpoints.

## Roles

The database role set becomes:

```text
CUSTOMER
ADMIN
SUPERADMIN
```
'''
)

print()
print("Milestone 14 DB PARTIAL setup completed: only the uploaded portion was executed.")
PY
