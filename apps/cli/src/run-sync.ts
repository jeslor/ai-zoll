import * as fs from "node:fs";
import * as path from "node:path";
import { safeParseBlueprint } from "@ai-zoll/blueprint";
import { getAgentAdapter, SUPPORTED_AGENT_IDS } from "@ai-zoll/agents";
import type { SupportedAgentId } from "@ai-zoll/agents";
import { assertNoDuplicatePaths, generateWorkspace } from "@ai-zoll/generators";
import type { GeneratedFile } from "@ai-zoll/shared";
import {
  extractCustomZone,
  hasCustomContent,
  mergeManagedContent,
} from "./managed-content";
import { readProjectState, writeProjectState } from "./project-state";

export interface RunSyncOptions {
  projectDir: string;
  /** Omitted = re-sync with whatever agent is currently stored. */
  agentId?: SupportedAgentId;
}

export interface PreservedFile {
  path: string;
  reason: string;
}

export interface RunSyncResult {
  projectDir: string;
  agentId: SupportedAgentId;
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
 * new file set — this covers both an agent switch (the outgoing agent's
 * files) and a Blueprint edit alone (e.g. disabling all testing flags drops
 * skills/testing/SKILL.md), with no special-casing needed for either cause.
 * Runs before writing new files (see runSync) so a stale directory from an
 * old agent can't collide with a path the new file set wants to use.
 */
function reconcileOrphans(
  projectDir: string,
  stalePaths: string[],
  result: RunSyncResult,
): void {
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

function writeGeneratedFiles(
  projectDir: string,
  files: GeneratedFile[],
  result: RunSyncResult,
): void {
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
 * Regenerates an already-initialized project's files — either re-syncing
 * with its current agent (agentId omitted) or switching to a different one.
 * Zero AI involved: the Blueprint is already validated and stored, this is
 * pure generateWorkspace + AgentAdapter re-rendering, with hand-written
 * content below each file's managed-region markers preserved verbatim.
 */
export async function runSync(options: RunSyncOptions): Promise<RunSyncResult> {
  const { projectDir } = options;
  const state = readProjectState(projectDir);

  const requestedAgentId = options.agentId ?? state.blueprint.agent.primary;
  if (!SUPPORTED_AGENT_IDS.includes(requestedAgentId as SupportedAgentId)) {
    throw new Error(
      `Agent "${requestedAgentId}" has no adapter yet — supported agents: ${SUPPORTED_AGENT_IDS.join(", ")}.`,
    );
  }
  const agentId = requestedAgentId as SupportedAgentId;

  const candidateBlueprint = { ...state.blueprint, agent: { primary: agentId } };
  const blueprintResult = safeParseBlueprint(candidateBlueprint);
  if (!blueprintResult.success) {
    throw new Error(
      `Blueprint is no longer valid after switching to agent "${agentId}": ` +
        blueprintResult.issues.map((issue) => `${issue.path || "(root)"}: ${issue.message}`).join("; "),
    );
  }
  const newBlueprint = blueprintResult.data;

  const adapter = getAgentAdapter(agentId);
  const validation = adapter.validate(newBlueprint);
  if (!validation.valid) {
    throw new Error(
      `Blueprint is not valid for agent "${agentId}":\n` +
        validation.issues.map((issue) => `  - ${issue}`).join("\n"),
    );
  }

  const newFiles: GeneratedFile[] = [
    ...generateWorkspace(newBlueprint),
    ...adapter.generateInstructions(newBlueprint),
    ...adapter.generateSkills(newBlueprint),
    ...adapter.generateRules(newBlueprint),
  ];
  assertNoDuplicatePaths(newFiles);

  const result: RunSyncResult = {
    projectDir,
    agentId,
    created: [],
    updated: [],
    deleted: [],
    preserved: [],
  };

  const newPaths = new Set(newFiles.map((file) => file.path));
  const stalePaths = state.generatedPaths.filter((p) => !newPaths.has(p));

  reconcileOrphans(projectDir, stalePaths, result);
  writeGeneratedFiles(projectDir, newFiles, result);

  // Preserved-orphan and unrecognized files drop out of tracking entirely —
  // they're now just ordinary files in the user's project, not something
  // ai-zoll manages going forward.
  writeProjectState(projectDir, {
    blueprint: newBlueprint,
    generatedPaths: newFiles.map((file) => file.path),
  });

  return result;
}
