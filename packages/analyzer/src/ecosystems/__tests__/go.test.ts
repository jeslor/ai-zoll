import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../../__fixtures__/make-fixture-repo";
import { readGoDependencyNames } from "../go";

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

describe("readGoDependencyNames", () => {
  it("extracts module paths from a require ( ... ) block, ignoring // indirect comments", () => {
    const dir = seed({
      "go.mod": `module github.com/acme/api

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/stretchr/testify v1.8.4 // indirect
)
`,
    });

    const names = readGoDependencyNames(dir);

    expect(names).toEqual(new Set(["github.com/gin-gonic/gin", "github.com/stretchr/testify"]));
  });

  it("extracts a single-line require directive", () => {
    const dir = seed({
      "go.mod": "module github.com/acme/api\n\ngo 1.21\n\nrequire github.com/lib/pq v1.10.9\n",
    });

    const names = readGoDependencyNames(dir);

    expect(names).toEqual(new Set(["github.com/lib/pq"]));
  });

  it("combines both block and single-line forms in the same file", () => {
    const dir = seed({
      "go.mod": `module github.com/acme/api

require (
	github.com/gin-gonic/gin v1.9.1
)

require github.com/lib/pq v1.10.9
`,
    });

    const names = readGoDependencyNames(dir);

    expect(names).toEqual(new Set(["github.com/gin-gonic/gin", "github.com/lib/pq"]));
  });

  it("returns an empty set when no go.mod exists", () => {
    const dir = seed({ "README.md": "# hi" });
    expect(readGoDependencyNames(dir)).toEqual(new Set());
  });
});
