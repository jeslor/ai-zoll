import * as fs from "node:fs";
import * as path from "node:path";

function readFileOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Scopes to `<dependency>...</dependency>` blocks specifically before
 * extracting `<artifactId>` — the same "scope to the right block first"
 * precedent `database-analyzer.ts` uses for Prisma's `datasource {}` block,
 * for the same reason: pom.xml also has `<plugin>`/`<parent>` elements with
 * their own `<artifactId>`, which would be a false match if the whole file
 * were searched unscoped.
 */
function readPomXml(repoPath: string): string[] {
  const content = readFileOrNull(path.join(repoPath, "pom.xml"));
  if (!content) {
    return [];
  }
  const names: string[] = [];
  const dependencyBlocks = content.match(/<dependency>[\s\S]*?<\/dependency>/g) ?? [];
  for (const block of dependencyBlocks) {
    const artifactMatch = /<artifactId>([^<]+)<\/artifactId>/.exec(block);
    if (artifactMatch?.[1]) {
      names.push(artifactMatch[1].trim());
    }
  }
  return names;
}

/**
 * Gradle (Groovy or Kotlin DSL) dependency declarations —
 * `implementation 'group:artifact:version'`,
 * `implementation("group:artifact:version")`, with or without a version.
 * Extracts the artifact segment (the middle of `group:artifact[:version]`),
 * which is the meaningful, matchable name (e.g. "spring-boot-starter-web",
 * not the groupId "org.springframework.boot").
 */
const GRADLE_DEPENDENCY_PATTERN =
  /\b(?:implementation|api|compileOnly|runtimeOnly|annotationProcessor|kapt|testImplementation|testRuntimeOnly|testCompileOnly)\s*[(]?\s*["']([^"':]+):([^"':]+)(?::[^"')]*)?["']/g;

function readGradleFile(repoPath: string, fileName: string): string[] {
  const content = readFileOrNull(path.join(repoPath, fileName));
  if (!content) {
    return [];
  }
  const names: string[] = [];
  for (const match of content.matchAll(GRADLE_DEPENDENCY_PATTERN)) {
    if (match[2]) {
      names.push(match[2]);
    }
  }
  return names;
}

/** Unions Maven (pom.xml) and Gradle (build.gradle / build.gradle.kts) — a repo uses one or the other, never both, but nothing stops checking. */
export function readJavaDependencyNames(repoPath: string): Set<string> {
  return new Set([
    ...readPomXml(repoPath),
    ...readGradleFile(repoPath, "build.gradle"),
    ...readGradleFile(repoPath, "build.gradle.kts"),
  ]);
}
