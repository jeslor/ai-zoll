import * as fs from "node:fs";
import * as path from "node:path";
import type { GeneratedFile } from "@ai-zoll/shared";
import { extractCustomZone, hasCustomContent, mergeManagedContent } from "./managed-content";

export interface PreservedFile {
  path: string;
  reason: string;
}

export interface ApplyResult {
  created: string[];
  updated: string[];
  deleted: string[];
  preserved: PreservedFile[];
}

function lstatOrNull(fullPath: string): fs.Stats | null {
  try {
    return fs.lstatSync(fullPath);
  } catch {
    return null;
  }
}

/**
 * True if any directory between `projectDir` and `fullPath`'s parent is
 * itself a symlink. `lstatSync(fullPath)` only reports on the leaf
 * component — a symlinked *ancestor* directory (e.g. `.cursor/rules` ->
 * `../agents/rules`, a real pattern found dogfooding against a real
 * monorepo that shares rule content across agent tools) resolves
 * transparently, so a leaf-only check sees an ordinary, nonexistent path
 * and happily creates/deletes through the symlink into whatever it
 * actually points at — which may be real, unrelated, git-tracked project
 * content this tool has no business touching. Checked before every write
 * and every stale-file deletion.
 */
function hasSymlinkedAncestor(projectDir: string, fullPath: string): boolean {
  let dir = path.dirname(fullPath);
  while (dir !== projectDir && dir.length > projectDir.length) {
    if (lstatOrNull(dir)?.isSymbolicLink()) {
      return true;
    }
    dir = path.dirname(dir);
  }
  return false;
}

/** Removes now-empty directories left behind by a deletion, up to (not including) projectDir. */
function pruneEmptyDirs(dir: string, projectDir: string): void {
  let current = dir;
  while (current !== projectDir && current.startsWith(projectDir + path.sep)) {
    let entries: string[];
    try {
      entries = fs.readdirSync(current);
    } catch {
      return;
    }
    if (entries.length > 0) {
      return;
    }
    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

/**
 * Reconciles files that were generated previously but aren't part of the
 * new file set — this covers an agent switch (the outgoing agent's files),
 * a Blueprint edit alone (e.g. disabling all testing flags drops
 * skills/testing/SKILL.md), or simply nothing (an empty previousGeneratedPaths
 * list, e.g. a first-time apply for `analyze`/`init`) — no special-casing
 * needed per cause. Runs before writing new files (see applyGeneratedFiles)
 * so a stale directory from an old agent can't collide with a path the new
 * file set wants to use.
 */
function reconcileOrphans(projectDir: string, stalePaths: string[], result: ApplyResult): void {
  for (const stalePath of stalePaths) {
    const fullPath = path.join(projectDir, stalePath);
    const lstat = lstatOrNull(fullPath);
    if (!lstat) {
      continue;
    }
    if (lstat.isSymbolicLink()) {
      result.preserved.push({ path: stalePath, reason: "path is a symlink, skipped for safety" });
      continue;
    }
    if (!lstat.isFile()) {
      result.preserved.push({ path: stalePath, reason: "not a regular file, skipped for safety" });
      continue;
    }
    if (hasSymlinkedAncestor(projectDir, fullPath)) {
      result.preserved.push({
        path: stalePath,
        reason: "a parent directory in this path is a symlink, skipped for safety",
      });
      continue;
    }

    const existingContent = fs.readFileSync(fullPath, "utf-8");
    const extracted = extractCustomZone(existingContent);
    if (extracted.customZone === null) {
      result.preserved.push({ path: stalePath, reason: extracted.detail });
      continue;
    }
    if (hasCustomContent(extracted.customZone)) {
      result.preserved.push({
        path: stalePath,
        reason: "no longer generated, but has content below the managed region",
      });
      continue;
    }

    fs.rmSync(fullPath);
    result.deleted.push(stalePath);
    pruneEmptyDirs(path.dirname(fullPath), projectDir);
  }
}

function writeGeneratedFiles(projectDir: string, files: GeneratedFile[], result: ApplyResult): void {
  for (const file of files) {
    const fullPath = path.join(projectDir, file.path);
    const lstat = lstatOrNull(fullPath);

    if (lstat?.isSymbolicLink()) {
      result.preserved.push({ path: file.path, reason: "path is a symlink, skipped for safety" });
      continue;
    }
    if (lstat?.isDirectory()) {
      result.preserved.push({ path: file.path, reason: "a directory already exists at this path" });
      continue;
    }
    if (hasSymlinkedAncestor(projectDir, fullPath)) {
      result.preserved.push({
        path: file.path,
        reason: "a parent directory in this path is a symlink, skipped for safety",
      });
      continue;
    }

    // A file that exists but has no managed markers predates ai-zoll (a
    // hand-written README.md, existing application source) — mergeManagedContent
    // reports this as "unrecognized" and leaves it byte-for-byte untouched.
    // This is what makes existing-project adoption (`analyze`) non-destructive
    // by construction (Rule 10), not a special case for it.
    const existingContent = lstat?.isFile() ? fs.readFileSync(fullPath, "utf-8") : undefined;
    const merge = mergeManagedContent(existingContent, file.content);

    if (merge.status === "unrecognized") {
      result.preserved.push({ path: file.path, reason: merge.detail ?? "unrecognized existing content" });
      continue;
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, merge.content);
    if (merge.status === "created") {
      result.created.push(file.path);
    } else {
      result.updated.push(file.path);
    }
  }
}

/**
 * Applies a generated file set to a project directory, safely: merges with
 * (never blindly overwrites) existing content, reconciles files no longer
 * produced, and never touches symlinks or unrecognized (pre-ai-zoll)
 * content without reporting it. Shared by `runSync` (previousGeneratedPaths
 * = the prior state) and `runAnalyze`/first-time `runInit` (`[]` — nothing
 * to reconcile as stale on a first apply).
 */
export function applyGeneratedFiles(
  projectDir: string,
  files: GeneratedFile[],
  previousGeneratedPaths: string[],
): ApplyResult {
  const result: ApplyResult = { created: [], updated: [], deleted: [], preserved: [] };

  const newPaths = new Set(files.map((file) => file.path));
  const stalePaths = previousGeneratedPaths.filter((p) => !newPaths.has(p));

  reconcileOrphans(projectDir, stalePaths, result);
  writeGeneratedFiles(projectDir, files, result);

  return result;
}
