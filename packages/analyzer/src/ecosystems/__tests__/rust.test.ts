import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../../__fixtures__/make-fixture-repo";
import { readRustDependencyNames } from "../rust";

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

describe("readRustDependencyNames", () => {
  it("extracts keys from [dependencies]/[dev-dependencies]/[build-dependencies], both simple and inline-table styles", () => {
    const dir = seed({
      "Cargo.toml": `
[package]
name = "my-app"
version = "0.1.0"

[dependencies]
axum = "0.7"
serde = { version = "1.0", features = ["derive"] }

[dev-dependencies]
tokio-test = "0.4"

[build-dependencies]
cc = "1.0"
`,
    });

    const names = readRustDependencyNames(dir);

    expect(names).toEqual(new Set(["axum", "serde", "tokio-test", "cc"]));
  });

  it("returns an empty set when no Cargo.toml exists", () => {
    const dir = seed({ "README.md": "# hi" });
    expect(readRustDependencyNames(dir)).toEqual(new Set());
  });
});
