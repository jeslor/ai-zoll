import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzeDependencies } from "../dependency-analyzer";

let tempDirs: string[] = [];

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function seed(deps: Record<string, string>): string {
  const dir = makeFixtureRepo({ "package.json": JSON.stringify({ dependencies: deps }) });
  tempDirs.push(dir);
  return dir;
}

function seedFiles(files: Record<string, string>): string {
  const dir = makeFixtureRepo(files);
  tempDirs.push(dir);
  return dir;
}

describe("analyzeDependencies — authentication", () => {
  it("detects jwt from jsonwebtoken", () => {
    expect(analyzeDependencies(seed({ jsonwebtoken: "^9.0.0" })).authentication).toEqual({
      value: "jwt",
      confidence: "likely",
      reason: expect.stringContaining("jsonwebtoken"),
    });
  });

  it("prefers a strategy-specific passport package over the bare 'passport' package", () => {
    const dir = seed({ passport: "^0.7.0", "passport-jwt": "^4.0.1" });

    expect(analyzeDependencies(dir).authentication.value).toBe("passport-jwt");
  });

  it("falls back to bare 'passport' when no strategy-specific package is present", () => {
    expect(analyzeDependencies(seed({ passport: "^0.7.0" })).authentication.value).toBe("passport");
  });

  it("detects next-auth and clerk", () => {
    expect(analyzeDependencies(seed({ "next-auth": "^4.24.0" })).authentication.value).toBe("next-auth");
    expect(analyzeDependencies(seed({ "@clerk/nextjs": "^5.0.0" })).authentication.value).toBe("clerk");
  });

  it("returns unknown when nothing recognized is present", () => {
    expect(analyzeDependencies(seed({ lodash: "^4.17.0" })).authentication.confidence).toBe("unknown");
  });
});

describe("analyzeDependencies — authorization", () => {
  it("detects casl", () => {
    expect(analyzeDependencies(seed({ "@casl/ability": "^6.7.0" })).authorization).toEqual({
      value: "casl",
      confidence: "likely",
      reason: expect.stringContaining("@casl/ability"),
    });
  });

  it("detects rbac-style libraries", () => {
    expect(analyzeDependencies(seed({ accesscontrol: "^2.2.1" })).authorization.value).toBe("rbac");
  });

  it("does not infer authorization from a password-hashing library alone", () => {
    expect(analyzeDependencies(seed({ bcrypt: "^5.1.0" })).authorization.confidence).toBe("unknown");
  });

  it("returns unknown when nothing recognized is present", () => {
    expect(analyzeDependencies(seed({})).authorization.confidence).toBe("unknown");
  });
});

describe("analyzeDependencies — multi-language authentication/authorization", () => {
  it("detects jwt libraries from non-Node ecosystems", () => {
    const python = seedFiles({ "requirements.txt": "pyjwt==2.8.0\n" });
    expect(analyzeDependencies(python).authentication.value).toBe("jwt");

    const go = seedFiles({ "go.mod": "module acme\n\nrequire github.com/golang-jwt/jwt/v5 v5.2.0\n" });
    expect(analyzeDependencies(go).authentication.value).toBe("jwt");
  });

  it("distinguishes Laravel's Passport (OAuth2 server) from Node's Passport.js — not the same 'passport' value", () => {
    const laravel = seedFiles({
      "composer.json": JSON.stringify({ require: { "laravel/passport": "^12.0" } }),
    });
    expect(analyzeDependencies(laravel).authentication.value).toBe("laravel-passport");
  });

  it("detects casbin (a real package under that exact name in both Python and Go)", () => {
    const python = seedFiles({ "requirements.txt": "casbin==1.36.0\n" });
    expect(analyzeDependencies(python).authorization.value).toBe("casbin");

    const go = seedFiles({ "go.mod": "module acme\n\nrequire github.com/casbin/casbin/v2 v2.77.0\n" });
    expect(analyzeDependencies(go).authorization.value).toBe("casbin");
  });
});
