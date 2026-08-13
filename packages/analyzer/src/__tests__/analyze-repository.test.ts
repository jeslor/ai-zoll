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
});
