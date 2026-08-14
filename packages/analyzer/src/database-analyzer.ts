import * as fs from "node:fs";
import * as path from "node:path";
import type { Confidence, Finding } from "./finding";
import { readAllDependencyNames } from "./read-dependency-names";

export interface DatabaseAnalyzerResult {
  database: Finding<string>;
  orm: Finding<string>;
}

const UNKNOWN: Finding<string> = {
  value: null,
  confidence: "unknown",
  reason: "no recognized database/ORM signal found at the repo root",
};

/**
 * Two-stage, deliberately narrow regex — not a real Prisma parser. Stage 1
 * scopes to the `datasource { ... }` block specifically (Prisma schemas also
 * have a `generator client { provider = "prisma-client-js" }` block, which
 * ALSO has a `provider` field — matching the whole file unscoped would risk
 * picking that up instead of the real database provider). Stage 2 skips
 * `//`-commented lines within that block, so a commented-out alternate
 * provider left above the real one for reference isn't false-matched.
 * A `provider = env("...")`-wrapped value (rather than a literal string)
 * naturally fails to match and degrades to unknown, rather than misparsing
 * the env var name as if it were the provider. Multi-file Prisma schemas
 * (prisma/schema/*.prisma, a newer Prisma feature) aren't handled — a
 * documented v1 limitation, not a bug.
 */
function extractPrismaProvider(schemaContent: string): string | null {
  const blockMatch = schemaContent.match(/datasource\s+\w+\s*\{([^}]*)\}/);
  if (!blockMatch) {
    return null;
  }
  const blockContent = blockMatch[1] ?? "";

  const activeLines = blockContent.split("\n").filter((line) => !line.trim().startsWith("//"));
  const providerMatch = activeLines.join("\n").match(/provider\s*=\s*"([^"]+)"/);
  return providerMatch ? (providerMatch[1] ?? null) : null;
}

/** Raw database driver/provider packages, one block per ecosystem — the same "detected package IS evidence of a driver, not proof it's wired up" caveat applies to every entry, not just the original Node ones. */
const DRIVER_TO_DATABASE: Array<[dependency: string, database: string]> = [
  // Node/JS
  ["pg", "postgresql"],
  ["postgres", "postgresql"],
  ["mysql2", "mysql"],
  ["better-sqlite3", "sqlite"],
  // Python — "psycopg" (no suffix) is psycopg3, a separate, newer package
  // from "psycopg2"/"psycopg2-binary", found dogfooding against a real
  // FastAPI template that used it exclusively.
  ["psycopg2", "postgresql"],
  ["psycopg2-binary", "postgresql"],
  ["psycopg", "postgresql"],
  ["asyncpg", "postgresql"],
  ["pymysql", "mysql"],
  ["mysqlclient", "mysql"],
  ["pymongo", "mongodb"],
  // Java
  ["postgresql", "postgresql"],
  ["mysql-connector-j", "mysql"],
  ["mysql-connector-java", "mysql"],
  // Rust
  ["tokio-postgres", "postgresql"],
  ["mysql_async", "mysql"],
  // Go
  ["github.com/lib/pq", "postgresql"],
  ["github.com/jackc/pgx/v5", "postgresql"],
  ["github.com/go-sql-driver/mysql", "mysql"],
  // Ruby
  ["pg", "postgresql"],
  ["mysql2", "mysql"],
  ["sqlite3", "sqlite"],
  // .NET — also implies EF Core as the ORM, see ORM_SIGNALS below
  ["Npgsql", "postgresql"],
  ["Npgsql.EntityFrameworkCore.PostgreSQL", "postgresql"],
  ["Microsoft.EntityFrameworkCore.SqlServer", "sqlserver"],
  ["Pomelo.EntityFrameworkCore.MySql", "mysql"],
  ["Microsoft.EntityFrameworkCore.Sqlite", "sqlite"],
];

/**
 * ORM/ODM dependency signals (checked after the Prisma-schema-file special
 * case below, and after drizzle/typeorm's existing dedicated branches — see
 * analyzeDatabase). One block per ecosystem. Some entries are the framework
 * itself rather than a separate ORM package, because that ecosystem bundles
 * its ORM into the framework (Django's own ORM, Rails' ActiveRecord,
 * Laravel's Eloquent) — checking the same dependency name here and in
 * `BACKEND_SIGNALS` (framework-analyzer.ts) is intentional, not a bug: two
 * independent analyzers legitimately draw two different conclusions from
 * the same fact.
 */
const ORM_SIGNALS: Array<[dependency: string, value: string]> = [
  // Python — sqlmodel (Pydantic + SQLAlchemy combined, from the same
  // author as FastAPI) is checked before plain sqlalchemy since a sqlmodel
  // project also commonly has sqlalchemy as sqlmodel's own transitive
  // dependency, and sqlmodel is the more specific, informative fact.
  ["sqlmodel", "sqlmodel"],
  ["sqlalchemy", "sqlalchemy"],
  ["django", "django-orm"],
  // Java
  ["spring-boot-starter-data-jpa", "hibernate"],
  ["hibernate-core", "hibernate"],
  ["mybatis", "mybatis"],
  // Rust
  ["diesel", "diesel"],
  ["sea-orm", "sea-orm"],
  ["sqlx", "sqlx"],
  // Go
  ["gorm.io/gorm", "gorm"],
  // Ruby
  ["activerecord", "activerecord"],
  ["rails", "activerecord"],
  ["sequel", "sequel"],
  // PHP
  ["doctrine/orm", "doctrine"],
  ["laravel/framework", "eloquent"],
  // .NET
  ["Microsoft.EntityFrameworkCore", "efcore"],
  ["Microsoft.EntityFrameworkCore.SqlServer", "efcore"],
  ["Npgsql.EntityFrameworkCore.PostgreSQL", "efcore"],
  ["Pomelo.EntityFrameworkCore.MySql", "efcore"],
  ["Microsoft.EntityFrameworkCore.Sqlite", "efcore"],
];

function matchOrmSignal(dependencyNames: Set<string>): Finding<string> {
  for (const [dependency, value] of ORM_SIGNALS) {
    if (dependencyNames.has(dependency)) {
      return { value, confidence: "detected", reason: `found "${dependency}" in dependencies` };
    }
  }
  return UNKNOWN;
}

function inferDatabaseFromDriver(dependencyNames: Set<string>): Finding<string> {
  for (const [dependency, database] of DRIVER_TO_DATABASE) {
    if (dependencyNames.has(dependency)) {
      return {
        value: database,
        confidence: "likely",
        reason: `found driver package "${dependency}" — doesn't prove it's the wired-up primary database`,
      };
    }
  }
  return UNKNOWN;
}

/**
 * Repo-root only (see packages/analyzer/README.md). Checked in this order —
 * a stated simplification, not a silent one: Prisma (via its own schema
 * file, the strongest possible signal) first, then drizzle, then typeorm,
 * then mongoose, then every other ecosystem's `ORM_SIGNALS` entry. A repo
 * mid-migration between ORMs (more common than it sounds) will only ever
 * report the first one found; this is a known v1 limitation rather than
 * detect-both-and-flag-ambiguous, which is more than this slice needs.
 */
export function analyzeDatabase(repoPath: string): DatabaseAnalyzerResult {
  const schemaPath = path.join(repoPath, "prisma", "schema.prisma");
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const provider = extractPrismaProvider(schemaContent);
    if (provider) {
      const detected: Confidence = "detected";
      return {
        orm: { value: "prisma", confidence: detected, reason: "found prisma/schema.prisma" },
        database: {
          value: provider,
          confidence: detected,
          reason: `found datasource provider "${provider}" in prisma/schema.prisma`,
        },
      };
    }
    // Schema file exists but the provider couldn't be confidently extracted
    // (env()-wrapped, malformed, or a multi-file schema) — still confident
    // it's Prisma, just not which database.
    return {
      orm: { value: "prisma", confidence: "detected", reason: "found prisma/schema.prisma" },
      database: UNKNOWN,
    };
  }

  const dependencyNames = readAllDependencyNames(repoPath);

  if (dependencyNames.has("drizzle-orm")) {
    return {
      orm: { value: "drizzle", confidence: "detected", reason: 'found "drizzle-orm" in dependencies' },
      database: inferDatabaseFromDriver(dependencyNames),
    };
  }

  if (dependencyNames.has("typeorm")) {
    return {
      orm: { value: "typeorm", confidence: "detected", reason: 'found "typeorm" in dependencies' },
      database: inferDatabaseFromDriver(dependencyNames),
    };
  }

  if (dependencyNames.has("mongoose")) {
    return {
      // mongoose is an ODM, not one of the Blueprint's known ORM values
      // (prisma/drizzle/typeorm/sqlalchemy) — a Blueprint-schema gap, not
      // just an analyzer quirk: there's no slot for ODMs yet.
      orm: UNKNOWN,
      database: { value: "mongodb", confidence: "detected", reason: 'found "mongoose" in dependencies' },
    };
  }

  const orm = matchOrmSignal(dependencyNames);
  if (orm.confidence !== "unknown") {
    return { orm, database: inferDatabaseFromDriver(dependencyNames) };
  }

  // No ORM detected at all — still worth checking for a raw driver package
  // (a real, common shape in Go/Rust backends especially, where hand-written
  // SQL over a raw driver is idiomatic, not a stopgap before "real" ORM
  // adoption). A deliberate, small behavior change from this analyzer's
  // pre-multi-language shape, where a driver was only ever checked
  // *alongside* a confirmed ORM, never standalone — that left every
  // ORM-less-but-has-a-real-driver project reporting `database: unknown`
  // for no good reason.
  return { database: inferDatabaseFromDriver(dependencyNames), orm: UNKNOWN };
}
