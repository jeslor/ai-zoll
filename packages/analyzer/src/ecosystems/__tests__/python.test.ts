import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../../__fixtures__/make-fixture-repo";
import { readPythonDependencyNames } from "../python";

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

describe("readPythonDependencyNames", () => {
  it("parses requirements.txt, stripping version specifiers, extras, comments, and flag lines", () => {
    const dir = seed({
      "requirements.txt": [
        "django==4.2.0",
        "requests>=2.28,<3.0",
        "djangorestframework[extras]==3.14  # web api",
        "# a pure comment",
        "",
        "-r other-requirements.txt",
        "-e git+https://example.com/pkg.git#egg=editable-pkg",
        "flask",
      ].join("\n"),
    });

    const names = readPythonDependencyNames(dir);

    expect(names).toEqual(new Set(["django", "requests", "djangorestframework", "flask"]));
  });

  it("parses PEP 621's [project] dependencies array in pyproject.toml", () => {
    const dir = seed({
      "pyproject.toml": [
        "[project]",
        'name = "myapp"',
        'dependencies = [',
        '  "fastapi>=0.100.0",',
        '  "sqlalchemy",',
        "]",
      ].join("\n"),
    });

    const names = readPythonDependencyNames(dir);

    expect(names).toEqual(new Set(["fastapi", "sqlalchemy"]));
  });

  it("doesn't truncate the dependencies array when an entry contains its own brackets (extras syntax)", () => {
    // A real shape found dogfooding against tiangolo/full-stack-fastapi-template:
    // the array's first entry has extras syntax ("fastapi[standard]"), whose
    // own "]" a naive "match up to the first ]" regex would mistake for the
    // end of the whole array — silently dropping every entry after it.
    const dir = seed({
      "pyproject.toml": [
        "[project]",
        'name = "app"',
        "dependencies = [",
        '    "fastapi[standard]>=0.141.1,<1.0.0",',
        '    "psycopg[binary]>=3.3.4,<4.0.0",',
        '    "sqlmodel>=0.0.39,<1.0.0",',
        "]",
      ].join("\n"),
    });

    const names = readPythonDependencyNames(dir);

    expect(names).toEqual(new Set(["fastapi", "psycopg", "sqlmodel"]));
  });

  it("parses Poetry's [tool.poetry.dependencies] table, excluding the python constraint itself", () => {
    const dir = seed({
      "pyproject.toml": [
        "[tool.poetry.dependencies]",
        'python = "^3.11"',
        'django = "^4.2"',
        'psycopg2-binary = "^2.9"',
        "",
        "[tool.poetry.dev-dependencies]",
        'pytest = "^7.0"',
      ].join("\n"),
    });

    const names = readPythonDependencyNames(dir);

    expect(names).toEqual(new Set(["django", "psycopg2-binary", "pytest"]));
  });

  it("parses Pipfile's [packages]/[dev-packages] sections", () => {
    const dir = seed({
      Pipfile: ["[packages]", 'flask = "*"', "", "[dev-packages]", 'pytest = "*"'].join("\n"),
    });

    const names = readPythonDependencyNames(dir);

    expect(names).toEqual(new Set(["flask", "pytest"]));
  });

  it("returns an empty set when no Python manifest exists", () => {
    const dir = seed({ "README.md": "# hi" });
    expect(readPythonDependencyNames(dir)).toEqual(new Set());
  });
});
