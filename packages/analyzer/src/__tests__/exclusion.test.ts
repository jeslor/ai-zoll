import { describe, expect, it } from "vitest";
import { isExcludedPath } from "../exclusion";

describe("isExcludedPath", () => {
  it("excludes node_modules and .git at any depth", () => {
    expect(isExcludedPath("node_modules")).toBe(true);
    expect(isExcludedPath("packages/foo/node_modules/bar")).toBe(true);
    expect(isExcludedPath(".git")).toBe(true);
    expect(isExcludedPath(".git/config")).toBe(true);
  });

  it("excludes .env and its variants", () => {
    expect(isExcludedPath(".env")).toBe(true);
    expect(isExcludedPath(".env.local")).toBe(true);
    expect(isExcludedPath("apps/api/.env.production")).toBe(true);
  });

  it("excludes key/cert/credential files", () => {
    expect(isExcludedPath("server.pem")).toBe(true);
    expect(isExcludedPath("private.key")).toBe(true);
    expect(isExcludedPath("id_rsa")).toBe(true);
    expect(isExcludedPath("credentials.json")).toBe(true);
  });

  it("does not exclude ordinary project files", () => {
    expect(isExcludedPath("package.json")).toBe(false);
    expect(isExcludedPath("src/index.ts")).toBe(false);
    expect(isExcludedPath("prisma/schema.prisma")).toBe(false);
    expect(isExcludedPath("README.md")).toBe(false);
  });

  it("does not false-positive on filenames that merely contain an excluded word", () => {
    expect(isExcludedPath("environment.ts")).toBe(false);
    expect(isExcludedPath("keyboard-shortcuts.ts")).toBe(false);
  });
});
