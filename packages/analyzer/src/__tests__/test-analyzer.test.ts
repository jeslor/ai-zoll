import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzeTests } from "../test-analyzer";

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

describe("analyzeTests", () => {
  it("detects unit (vitest) and integration (supertest, likely) from dependencies", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        devDependencies: { vitest: "^4.0.0", supertest: "^6.3.0" },
      }),
    });

    const result = analyzeTests(dir);

    expect(result.unit).toEqual({ value: true, confidence: "detected", reason: expect.stringContaining("vitest") });
    expect(result.integration).toEqual({
      value: true,
      confidence: "likely",
      reason: expect.stringContaining("supertest"),
    });
    expect(result.e2e.confidence).toBe("unknown");
  });

  it("detects e2e from playwright", () => {
    const dir = seed({
      "package.json": JSON.stringify({ devDependencies: { "@playwright/test": "^1.44.0" } }),
    });

    expect(analyzeTests(dir).e2e).toEqual({
      value: true,
      confidence: "detected",
      reason: expect.stringContaining("@playwright/test"),
    });
  });

  it("falls back to a likely unit finding when a real (non-placeholder) test script exists with no known dependency", () => {
    const dir = seed({
      "package.json": JSON.stringify({ scripts: { test: "node --test" } }),
    });

    expect(analyzeTests(dir).unit).toEqual({
      value: true,
      confidence: "likely",
      reason: expect.stringContaining("scripts.test"),
    });
  });

  it("falls back to a likely unit finding from test files when no deps or scripts signal anything", () => {
    const dir = seed({
      "package.json": JSON.stringify({ name: "acme" }),
      "src/foo.test.ts": "test('works', () => {});",
    });

    expect(analyzeTests(dir).unit).toEqual({
      value: true,
      confidence: "likely",
      reason: expect.stringContaining("test files"),
    });
  });

  it("recognizes NestJS's official hyphenated e2e-spec naming convention (found via dogfooding against a real NestJS backend)", () => {
    // Deliberately not inside a directory named test/tests/__tests__ — this
    // isolates the file-naming-pattern fix from the (already-covered)
    // directory-name signal, which would otherwise mask the same gap.
    const dir = seed({
      "package.json": JSON.stringify({ name: "acme-api" }),
      "e2e/app.e2e-spec.ts": "describe('AppController (e2e)', () => {});",
    });

    expect(analyzeTests(dir).unit).toEqual({
      value: true,
      confidence: "likely",
      reason: expect.stringContaining("test files"),
    });
  });

  it("does not treat the npm-init placeholder test script as evidence of real tests", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        name: "quick-script",
        version: "1.0.0",
        scripts: { test: 'echo "Error: no test specified" && exit 1' },
        dependencies: { axios: "^1.6.0" },
      }),
    });

    const result = analyzeTests(dir);

    expect(result.unit).toEqual({
      value: false,
      confidence: "detected",
      reason: expect.stringContaining("no signal"),
    });
    expect(result.integration.value).toBe(false);
    expect(result.e2e.value).toBe(false);
  });

  it("reports a confident false for all three when genuinely nothing is found (the required non-detected case)", () => {
    const dir = seed({ "package.json": JSON.stringify({ name: "empty-project" }) });

    const result = analyzeTests(dir);

    expect(result.unit).toEqual({ value: false, confidence: "detected", reason: expect.any(String) });
    expect(result.integration).toEqual({ value: false, confidence: "detected", reason: expect.any(String) });
    expect(result.e2e).toEqual({ value: false, confidence: "detected", reason: expect.any(String) });
  });

  it("does not walk into node_modules or .git when looking for test files", () => {
    const dir = seed({
      "package.json": JSON.stringify({ name: "acme" }),
      "node_modules/some-dep/some.test.js": "should not count",
      ".git/hooks/pre-commit.test.sh": "should not count",
    });

    const result = analyzeTests(dir);

    expect(result.unit.value).toBe(false);
  });

  it("reports unknown (not a false negative) for a field with no evidence when other testing evidence exists", () => {
    const dir = seed({
      "package.json": JSON.stringify({ devDependencies: { jest: "^29.0.0" } }),
    });

    const result = analyzeTests(dir);

    expect(result.unit.value).toBe(true);
    expect(result.e2e).toEqual({ value: null, confidence: "unknown", reason: expect.any(String) });
    expect(result.integration).toEqual({ value: null, confidence: "unknown", reason: expect.any(String) });
  });

  it("detects pytest (Python) via dependency, and Go's file-naming convention via the walk fallback", () => {
    const python = seed({ "requirements.txt": "pytest==7.4.0\n" });
    expect(analyzeTests(python).unit).toEqual({ value: true, confidence: "detected", reason: expect.any(String) });

    // Go has no third-party test-runner dependency signal (cargo test/go
    // test are toolchain built-ins) — detection here relies entirely on
    // the file-naming walk, at "likely" confidence.
    const go = seed({
      "go.mod": "module acme\n",
      "handler_test.go": "package acme",
    });
    expect(analyzeTests(go).unit).toEqual({ value: true, confidence: "likely", reason: expect.any(String) });
  });

  it("recognizes Java/PHP's NameTest.ext suffix and .NET's NameTests.cs suffix via the file walk", () => {
    const java = seed({ "pom.xml": "<project></project>", "src/test/BookingServiceTest.java": "class X {}" });
    expect(analyzeTests(java).unit.value).toBe(true);

    const dotnet = seed({ "App.csproj": "<Project></Project>", "BookingServiceTests.cs": "class X {}" });
    expect(analyzeTests(dotnet).unit.value).toBe(true);
  });

  it("recognizes Ruby's RSpec _spec.rb naming and Python's test_*.py prefix via the file walk", () => {
    const ruby = seed({ Gemfile: 'gem "rails"\n', "spec/booking_spec.rb": "describe X" });
    expect(analyzeTests(ruby).unit.value).toBe(true);

    const python = seed({ "requirements.txt": "django==4.2\n", "tests/test_booking.py": "def test_x(): pass" });
    expect(analyzeTests(python).unit.value).toBe(true);
  });

  it("detects Rust's inline #[test]/#[cfg(test)] convention, which has no separate test-file naming at all", () => {
    const withInlineTest = seed({
      "Cargo.toml": '[package]\nname = "acme"\n',
      "src/lib.rs": "pub fn add(a: i32, b: i32) -> i32 { a + b }\n\n#[test]\nfn it_adds() { assert_eq!(add(1, 1), 2); }",
    });
    expect(analyzeTests(withInlineTest).unit).toEqual({
      value: true,
      confidence: "likely",
      reason: expect.any(String),
    });

    const withCfgTestModule = seed({
      "Cargo.toml": '[package]\nname = "acme"\n',
      "src/main.rs": "fn main() {}\n\n#[cfg(test)]\nmod tests {\n    #[test]\n    fn it_works() {}\n}",
    });
    expect(analyzeTests(withCfgTestModule).unit.value).toBe(true);

    // A plain .rs file with neither attribute must not false-positive.
    const withoutTests = seed({
      "Cargo.toml": '[package]\nname = "acme"\n',
      "src/main.rs": "fn main() { println!(\"hello\"); }",
    });
    expect(analyzeTests(withoutTests).unit.value).toBe(false);
  });
});
