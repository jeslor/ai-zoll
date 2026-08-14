import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzeRepository } from "../analyze-repository";

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

describe("analyzeRepository", () => {
  it("combines every analyzer's output into one result", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        name: "acme-api",
        description: "Acme's core API service",
        dependencies: { "@nestjs/core": "^10.0.0", jsonwebtoken: "^9.0.0" },
        devDependencies: { jest: "^29.0.0" },
      }),
      "prisma/schema.prisma": `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`,
      ".git/config": '[remote "origin"]\n\turl = git@github.com:acme/api-service.git\n',
      "src/domain/.gitkeep": "",
      "src/infrastructure/.gitkeep": "",
    });

    const result = analyzeRepository(dir);

    expect(result.package.name.value).toBe("acme-api");
    expect(result.framework.backend.value).toBe("nestjs");
    expect(result.database.orm.value).toBe("prisma");
    expect(result.database.database.value).toBe("postgresql");
    expect(result.testing.unit.value).toBe(true);
    expect(result.git.projectName.value).toBe("api-service");
    expect(result.dependency.authentication.value).toBe("jwt");
    expect(result.directory.signals.value?.sort()).toEqual(["domain", "infrastructure"]);
  });

  it("aggregates findings across workspace packages in a real monorepo shape (root + apps/web + apps/api)", () => {
    const dir = seed({
      "package.json": JSON.stringify({ name: "acme-monorepo", private: true, workspaces: ["apps/*", "packages/*"] }),
      "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - "packages/*"\n',
      "apps/web/package.json": JSON.stringify({
        dependencies: { next: "^14.2.0" },
        devDependencies: { vitest: "^1.5.0" },
      }),
      "apps/web/components/.gitkeep": "",
      "apps/web/hooks/.gitkeep": "",
      "apps/api/package.json": JSON.stringify({
        dependencies: { "@nestjs/core": "^10.0.0" },
        devDependencies: { jest: "^29.0.0" },
      }),
      "apps/api/prisma/schema.prisma": 'datasource db {\n  provider = "postgresql"\n}\n',
      "apps/api/src/controllers/.gitkeep": "",
      "apps/api/src/services/.gitkeep": "",
      // A frameworkless library package — must be a non-vote, not a disagreement.
      "packages/shared/package.json": JSON.stringify({ dependencies: { zod: "^3.22.0" } }),
    });

    const result = analyzeRepository(dir);

    // Only one location (apps/web) contributed a real finding here — passthrough,
    // no source-attribution suffix (that's only added when 2+ sources agree; see
    // merge-findings.test.ts's "notes corroboration when multiple sources agree").
    expect(result.framework.frontend).toEqual({
      value: "nextjs",
      confidence: "detected",
      reason: "found \"next\" in dependencies",
    });
    expect(result.framework.backend.value).toBe("nestjs");
    expect(result.database.orm.value).toBe("prisma");
    expect(result.database.database.value).toBe("postgresql");
    expect(result.testing.unit).toEqual({ value: true, confidence: "detected", reason: expect.any(String) });
    expect(result.directory.signals.value?.sort()).toEqual([
      "components",
      "controllers",
      "hooks",
      "services",
    ]);
  });

  it("reports unknown with full detail, not a silent guess, when subpackages disagree", () => {
    const dir = seed({
      "package.json": JSON.stringify({ name: "acme-monorepo", private: true, workspaces: ["apps/*"] }),
      "apps/web/package.json": JSON.stringify({ dependencies: { next: "^14.2.0" } }),
      "apps/marketing/package.json": JSON.stringify({ dependencies: { astro: "^4.7.0" } }),
    });

    const result = analyzeRepository(dir);

    expect(result.framework.frontend.confidence).toBe("unknown");
    expect(result.framework.frontend.reason).toContain("apps/web: nextjs");
    expect(result.framework.frontend.reason).toContain("apps/marketing: astro");
  });
});
