import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { discoverWorkspacePackages } from "../workspace-discovery";

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

describe("discoverWorkspacePackages", () => {
  it("discovers apps/* and packages/* by default", () => {
    const dir = seed({
      "apps/web/package.json": JSON.stringify({ name: "web" }),
      "packages/shared/package.json": JSON.stringify({ name: "shared" }),
    });

    const result = discoverWorkspacePackages(dir).map((p) => p.relativePath).sort();

    expect(result).toEqual(["apps/web", "packages/shared"]);
  });

  it("doesn't count a directory with no package.json", () => {
    const dir = seed({ "apps/docs-assets/README.md": "not a package" });

    expect(discoverWorkspacePackages(dir)).toEqual([]);
  });

  it("recognizes a custom glob root declared in pnpm-workspace.yaml (block style)", () => {
    const dir = seed({
      "services/billing/package.json": JSON.stringify({ name: "billing" }),
      "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - "services/*" # internal services\n',
    });

    const result = discoverWorkspacePackages(dir).map((p) => p.relativePath);

    expect(result).toEqual(["services/billing"]);
  });

  it("recognizes a custom glob root declared in pnpm-workspace.yaml (flow style)", () => {
    const dir = seed({
      "libs/utils/package.json": JSON.stringify({ name: "utils" }),
      "pnpm-workspace.yaml": 'packages: ["apps/*", "libs/*"]\n',
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath)).toEqual(["libs/utils"]);
  });

  it("skips exclusion globs (leading !) rather than treating them as roots", () => {
    const dir = seed({
      "apps/web/package.json": JSON.stringify({ name: "web" }),
      "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - "!apps/*/test-app"\n',
    });

    // Should not throw, and should not try to walk a literal "!apps" directory.
    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath)).toEqual(["apps/web"]);
  });

  it("degrades silently on a malformed pnpm-workspace.yaml — directory walk still finds the defaults", () => {
    const dir = seed({
      "apps/web/package.json": JSON.stringify({ name: "web" }),
      "pnpm-workspace.yaml": "not: valid: : yaml: [[[",
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath)).toEqual(["apps/web"]);
  });

  it("recognizes a custom glob root declared via package.json's workspaces field", () => {
    const dir = seed({
      "package.json": JSON.stringify({ name: "root", private: true, workspaces: ["apps/*", "tools/*"] }),
      "tools/cli/package.json": JSON.stringify({ name: "cli" }),
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath)).toEqual(["tools/cli"]);
  });

  it("does not double-count a package declared as a root in both workspaces and pnpm-workspace.yaml", () => {
    const dir = seed({
      "package.json": JSON.stringify({ name: "root", private: true, workspaces: ["apps/*"] }),
      "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n',
      "apps/web/package.json": JSON.stringify({ name: "web" }),
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath)).toEqual(["apps/web"]);
  });

  it("returns an empty array for a plain single-package repo", () => {
    const dir = seed({ "package.json": JSON.stringify({ name: "single" }) });

    expect(discoverWorkspacePackages(dir)).toEqual([]);
  });

  it("recognizes a direct package path declared in Cargo's [workspace] members (not just glob roots)", () => {
    const dir = seed({
      "Cargo.toml": '[workspace]\nmembers = ["core", "cli"]\n',
      "core/Cargo.toml": '[package]\nname = "core"\n',
      "cli/Cargo.toml": '[package]\nname = "cli"\n',
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath).sort()).toEqual(["cli", "core"]);
  });

  it("recognizes a Cargo workspace mixing direct paths and a glob root in the same members array", () => {
    const dir = seed({
      "Cargo.toml": '[workspace]\nmembers = ["core", "crates/*"]\n',
      "core/Cargo.toml": '[package]\nname = "core"\n',
      "crates/utils/Cargo.toml": '[package]\nname = "utils"\n',
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath).sort()).toEqual(["core", "crates/utils"]);
  });

  it("recognizes a Python uv workspace's members (a non-package.json manifest, previously undiscoverable even if declared)", () => {
    const dir = seed({
      "pyproject.toml": '[tool.uv.workspace]\nmembers = ["backend", "shared/*"]\n',
      "backend/pyproject.toml": '[project]\nname = "backend"\n',
      "shared/utils/pyproject.toml": '[project]\nname = "utils"\n',
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath).sort()).toEqual([
      "backend",
      "shared/utils",
    ]);
  });

  it("recognizes a Go workspace's go.work use directives (block and single-line forms)", () => {
    const dir = seed({
      "go.work": "go 1.21\n\nuse (\n\t./service-a\n\t./service-b\n)\n\nuse ./service-c\n",
      "service-a/go.mod": "module acme/service-a\n",
      "service-b/go.mod": "module acme/service-b\n",
      "service-c/go.mod": "module acme/service-c\n",
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath).sort()).toEqual([
      "service-a",
      "service-b",
      "service-c",
    ]);
  });

  it("recognizes a Maven multi-module reactor's <modules> declaration in pom.xml", () => {
    const dir = seed({
      "pom.xml": "<project><modules><module>api</module><module>payment</module></modules></project>",
      "api/pom.xml": "<project></project>",
      "payment/pom.xml": "<project></project>",
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath).sort()).toEqual(["api", "payment"]);
  });

  it("recognizes a package discovered via apps/*/packages/* even when it has a non-Node manifest", () => {
    const dir = seed({
      "apps/api/pyproject.toml": '[project]\nname = "api"\n',
    });

    expect(discoverWorkspacePackages(dir).map((p) => p.relativePath)).toEqual(["apps/api"]);
  });

  it("degrades silently when a declared direct package path doesn't actually have a recognized manifest", () => {
    const dir = seed({
      "Cargo.toml": '[workspace]\nmembers = ["ghost"]\n',
      // "ghost/" doesn't exist at all.
    });

    expect(discoverWorkspacePackages(dir)).toEqual([]);
  });
});
