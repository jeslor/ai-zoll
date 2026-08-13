import * as fs from "node:fs";
import * as path from "node:path";
import type { Confidence, Finding } from "./finding";
import { readDependencyNames } from "./read-package-json";

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

/** Both common Postgres client packages — missing either would miss real projects. */
const DRIVER_TO_DATABASE: Array<[dependency: string, database: string]> = [
  ["pg", "postgresql"],
  ["postgres", "postgresql"],
  ["mysql2", "mysql"],
  ["better-sqlite3", "sqlite"],
];

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
 * file, the strongest possible signal) first, then drizzle, then typeorm.
 * A repo mid-migration between ORMs (more common than it sounds) will only
 * ever report the first one found; this is a known v1 limitation rather
 * than detect-both-and-flag-ambiguous, which is more than this slice needs.
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

  const dependencyNames = readDependencyNames(repoPath);

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

  return { database: UNKNOWN, orm: UNKNOWN };
}
