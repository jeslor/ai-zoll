import * as fs from "node:fs";
import * as path from "node:path";
import type { Finding } from "./finding";
import { discoverWorkspacePackages } from "./workspace-discovery";

export interface GitAnalyzerResult {
  /** Fallback candidate for project.name — never authoritative. */
  projectName: Finding<string>;
  /**
   * A different kind of evidence than PackageAnalyzer's workspaces/
   * pnpm-workspace.yaml signal (directory structure vs. explicit config).
   * Deliberately not cross-referenced with it — reconciling multiple
   * analyzers' signals into one confident answer belongs to a later
   * "assemble Blueprint from analysis" stage, not an individual analyzer.
   */
  hasMonorepoLayout: Finding<boolean>;
}

const UNKNOWN_NAME: Finding<string> = {
  value: null,
  confidence: "unknown",
  reason: "no .git directory, no origin remote, or an unparseable remote URL",
};

const UNKNOWN_MONOREPO: Finding<boolean> = {
  value: null,
  confidence: "unknown",
  reason: "no apps/*/package.json or packages/*/package.json found",
};

/** Finds `[remote "origin"] url = ...` in a .git/config's INI-style content. */
function extractOriginUrl(gitConfigContent: string): string | null {
  let inOriginSection = false;
  for (const rawLine of gitConfigContent.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("[")) {
      inOriginSection = /^\[remote\s+"origin"\]$/.test(line);
      continue;
    }
    if (inOriginSection) {
      const match = line.match(/^url\s*=\s*(.+)$/);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }
  return null;
}

/**
 * Host-agnostic — not hardcoded to github.com, so GitLab/Bitbucket/
 * self-hosted remotes work too. Handles both SSH (git@host:org/repo.git)
 * and HTTPS (https://host/org/repo.git) forms, with or without the .git
 * suffix.
 */
function extractRepoName(url: string): string | null {
  let cleaned = url.trim();
  if (cleaned.endsWith(".git")) {
    cleaned = cleaned.slice(0, -4);
  }
  cleaned = cleaned.replace(/\/+$/, "");

  const lastSegment = cleaned.split(/[/:]/).pop();
  return lastSegment && lastSegment.length > 0 ? lastSegment : null;
}

/**
 * Delegates to workspace-discovery.ts, which also recognizes custom glob
 * roots declared in pnpm-workspace.yaml/package.json's "workspaces" field
 * beyond the original apps/*, packages/* defaults — an intentional, minor
 * enhancement over this function's original behavior, not a silent change:
 * nothing that was previously `true` can become `false`, only the reverse.
 */
function hasMonorepoDirectoryLayout(repoPath: string): boolean {
  return discoverWorkspacePackages(repoPath).length > 0;
}

/**
 * Reads .git/config directly by exact known path — a targeted read of one
 * specific, non-secret file (remote URLs, not credentials), the same
 * pattern DatabaseAnalyzer uses for prisma/schema.prisma. Doesn't go
 * through isExcludedPath — that gate is for open-ended traversal only (see
 * exclusion.ts's docblock).
 */
export function analyzeGit(repoPath: string): GitAnalyzerResult {
  const gitConfigPath = path.join(repoPath, ".git", "config");

  let projectName = UNKNOWN_NAME;
  try {
    const configContent = fs.readFileSync(gitConfigPath, "utf-8");
    const originUrl = extractOriginUrl(configContent);
    const repoName = originUrl ? extractRepoName(originUrl) : null;
    if (repoName) {
      projectName = {
        value: repoName,
        confidence: "likely",
        reason: `derived from the git remote "origin" URL (${originUrl})`,
      };
    }
  } catch {
    // no .git/config — leave projectName as UNKNOWN_NAME
  }

  const hasMonorepoLayout = hasMonorepoDirectoryLayout(repoPath)
    ? {
        value: true,
        confidence: "likely" as const,
        reason: "found apps/*/package.json or packages/*/package.json",
      }
    : UNKNOWN_MONOREPO;

  return { projectName, hasMonorepoLayout };
}
