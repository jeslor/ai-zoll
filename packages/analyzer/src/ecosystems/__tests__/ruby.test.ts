import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../../__fixtures__/make-fixture-repo";
import { readRubyDependencyNames } from "../ruby";

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

describe("readRubyDependencyNames", () => {
  it("extracts gem names regardless of quote style or group-block nesting", () => {
    const dir = seed({
      Gemfile: `source "https://rubygems.org"

gem "rails", "~> 7.0"
gem 'devise'
gem "pg", ">= 1.1"

group :development, :test do
  gem "rspec-rails"
end
`,
    });

    const names = readRubyDependencyNames(dir);

    expect(names).toEqual(new Set(["rails", "devise", "pg", "rspec-rails"]));
  });

  it("returns an empty set when no Gemfile exists", () => {
    const dir = seed({ "README.md": "# hi" });
    expect(readRubyDependencyNames(dir)).toEqual(new Set());
  });
});
