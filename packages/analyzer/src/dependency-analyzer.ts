import type { Finding } from "./finding";
import { readAllDependencyNames } from "./read-dependency-names";

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
  // Node/JS
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
  // Python
  ["djangorestframework-simplejwt", "jwt"],
  ["pyjwt", "jwt"],
  ["python-jose", "jwt"],
  ["authlib", "oauth"],
  // Java
  ["jjwt", "jwt"],
  ["java-jwt", "jwt"],
  // Rust — the "jsonwebtoken" crate happens to share its exact name with
  // the Node/JS package above; both map to the same "jwt" value, so no
  // separate entry is needed here.
  // Go
  ["github.com/golang-jwt/jwt/v5", "jwt"],
  ["github.com/golang-jwt/jwt", "jwt"],
  ["github.com/dgrijalva/jwt-go", "jwt"],
  // Ruby
  ["devise", "devise"],
  ["jwt", "jwt"],
  // PHP — Laravel's own "Passport" package is a distinct, unrelated thing
  // from Node's Passport.js (an OAuth2 server implementation vs. an auth
  // middleware strategy library); deliberately not reusing the bare
  // "passport" value here, which would silently conflate the two.
  ["firebase/php-jwt", "jwt"],
  ["laravel/sanctum", "sanctum"],
  ["laravel/passport", "laravel-passport"],
  // .NET
  ["Microsoft.AspNetCore.Authentication.JwtBearer", "jwt"],
  ["Microsoft.AspNetCore.Identity", "identity"],
];

/**
 * Deliberately narrow — bcrypt/argon2/other password-hashing libraries say
 * nothing about the auth *mechanism* (JWT/sessions/OAuth all commonly hash
 * passwords too), and firebase/firebase-admin are too ambiguous (used for
 * far more than auth) to be a safe signal. Matches the "never pretend
 * certainty" rule: better to report unknown than guess broadly.
 */
const AUTHORIZATION_SIGNALS: Array<[dependency: string, value: string]> = [
  // Node/JS
  ["@casl/ability", "casl"],
  ["accesscontrol", "rbac"],
  ["node-acl", "rbac"],
  // Python and Go both have a real "casbin" package under that exact name
  // (PyPI's "casbin" and Go module "github.com/casbin/casbin/v2") — a
  // genuine, unambiguous RBAC/ABAC library in both ecosystems.
  ["casbin", "casbin"],
  ["github.com/casbin/casbin/v2", "casbin"],
  // Ruby — deliberately narrow, same reasoning as the rest of this table:
  // cancancan/pundit are specific, well-known authorization gems, not a
  // generic "this project has some notion of authorization" signal.
  ["cancancan", "rbac"],
  ["pundit", "pundit"],
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

/** Repo-root manifests only — see packages/analyzer/README.md. */
export function analyzeDependencies(repoPath: string): DependencyAnalyzerResult {
  const dependencyNames = readAllDependencyNames(repoPath);

  return {
    authentication: matchSignal(dependencyNames, AUTHENTICATION_SIGNALS),
    authorization: matchSignal(dependencyNames, AUTHORIZATION_SIGNALS),
  };
}
