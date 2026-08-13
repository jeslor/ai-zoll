import type { Finding } from "./finding";
import { readDependencyNames } from "./read-package-json";

export interface DependencyAnalyzerResult {
  authentication: Finding<string>;
  authorization: Finding<string>;
}

const UNKNOWN: Finding<string> = {
  value: null,
  confidence: "unknown",
  reason: "no recognized authentication/authorization dependency found",
};

/**
 * Always "likely", never "detected" — inferring an auth *mechanism* from a
 * dependency list is inherently indirect, unlike e.g. FrameworkAnalyzer's
 * "next" -> nextjs (a dependency IS the framework, not just evidence of one).
 * Strategy-specific passport-* packages are checked before the bare
 * "passport" package — more informative when present (passport alone just
 * says "some strategy," passport-jwt says which one).
 */
const AUTHENTICATION_SIGNALS: Array<[dependency: string, value: string]> = [
  ["passport-jwt", "passport-jwt"],
  ["passport-local", "passport-local"],
  ["passport-google-oauth20", "passport-google-oauth20"],
  ["passport", "passport"],
  ["jsonwebtoken", "jwt"],
  ["@nestjs/jwt", "jwt"],
  ["jose", "jwt"],
  ["next-auth", "next-auth"],
  ["@clerk/nextjs", "clerk"],
  ["@auth0/nextjs-auth0", "auth0"],
  ["auth0", "auth0"],
];

/**
 * Deliberately narrow — bcrypt/argon2/other password-hashing libraries say
 * nothing about the auth *mechanism* (JWT/sessions/OAuth all commonly hash
 * passwords too), and firebase/firebase-admin are too ambiguous (used for
 * far more than auth) to be a safe signal. Matches the "never pretend
 * certainty" rule: better to report unknown than guess broadly.
 */
const AUTHORIZATION_SIGNALS: Array<[dependency: string, value: string]> = [
  ["@casl/ability", "casl"],
  ["accesscontrol", "rbac"],
  ["node-acl", "rbac"],
];

function matchSignal(
  dependencyNames: Set<string>,
  signals: Array<[dependency: string, value: string]>,
): Finding<string> {
  for (const [dependency, value] of signals) {
    if (dependencyNames.has(dependency)) {
      return { value, confidence: "likely", reason: `found "${dependency}" in dependencies` };
    }
  }
  return UNKNOWN;
}

/** Repo-root package.json only — see packages/analyzer/README.md. */
export function analyzeDependencies(repoPath: string): DependencyAnalyzerResult {
  const dependencyNames = readDependencyNames(repoPath);

  return {
    authentication: matchSignal(dependencyNames, AUTHENTICATION_SIGNALS),
    authorization: matchSignal(dependencyNames, AUTHORIZATION_SIGNALS),
  };
}
