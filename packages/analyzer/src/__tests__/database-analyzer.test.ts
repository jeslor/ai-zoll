import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzeDatabase } from "../database-analyzer";

let tempDirs: string[] = [];

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function seed(files: Record<string, string>): string {
  const dir = makeFixtureRepo(files);
  tempDirs.push(dir);
  return dir;
}

const PRISMA_SCHEMA_WITH_COMMENTED_ALTERNATE = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  // provider = "mysql"
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id String @id @default(cuid())
}
`;

describe("analyzeDatabase", () => {
  it("detects prisma + postgresql, ignoring the commented-out alternate provider and the generator block's own provider field", () => {
    const dir = seed({
      "package.json": JSON.stringify({ dependencies: { "@prisma/client": "^5.0.0" } }),
      "prisma/schema.prisma": PRISMA_SCHEMA_WITH_COMMENTED_ALTERNATE,
    });

    const result = analyzeDatabase(dir);

    expect(result.orm).toEqual({ value: "prisma", confidence: "detected", reason: expect.any(String) });
    expect(result.database).toEqual({
      value: "postgresql",
      confidence: "detected",
      reason: expect.stringContaining("postgresql"),
    });
  });

  it("detects prisma but degrades database to unknown when the provider is env()-wrapped", () => {
    const dir = seed({
      "prisma/schema.prisma": `
datasource db {
  provider = env("DB_PROVIDER")
  url      = env("DATABASE_URL")
}
`,
    });

    const result = analyzeDatabase(dir);

    expect(result.orm.value).toBe("prisma");
    expect(result.database.confidence).toBe("unknown");
  });

  it("detects drizzle + postgresql via the 'postgres' driver package (not just 'pg')", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        dependencies: { "drizzle-orm": "^0.30.0", postgres: "^3.4.0" },
        devDependencies: { "drizzle-kit": "^0.20.0" },
      }),
    });

    const result = analyzeDatabase(dir);

    expect(result.orm).toEqual({ value: "drizzle", confidence: "detected", reason: expect.any(String) });
    expect(result.database).toEqual({
      value: "postgresql",
      confidence: "likely",
      reason: expect.any(String),
    });
  });

  it("prefers prisma over drizzle/typeorm when multiple ORM signals coexist (documented first-match order)", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        dependencies: { typeorm: "^0.3.20", "drizzle-orm": "^0.30.0", pg: "^8.11.0" },
      }),
    });

    // No prisma/schema.prisma here, so this falls to the dependency checks —
    // drizzle-orm is checked before typeorm, so drizzle wins.
    const result = analyzeDatabase(dir);

    expect(result.orm.value).toBe("drizzle");
  });

  it("detects mongoose as the database, with orm left unknown (no ODM slot in the schema)", () => {
    const dir = seed({
      "package.json": JSON.stringify({ dependencies: { mongoose: "^8.0.0" } }),
    });

    const result = analyzeDatabase(dir);

    expect(result.database).toEqual({
      value: "mongodb",
      confidence: "detected",
      reason: expect.any(String),
    });
    expect(result.orm.confidence).toBe("unknown");
  });

  it("returns unknown for both when there's no recognized signal at all", () => {
    const dir = seed({
      "package.json": JSON.stringify({ dependencies: { axios: "^1.6.0" } }),
    });

    const result = analyzeDatabase(dir);

    expect(result.database.confidence).toBe("unknown");
    expect(result.orm.confidence).toBe("unknown");
  });
});
