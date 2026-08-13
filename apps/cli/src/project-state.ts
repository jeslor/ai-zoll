import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { safeParseBlueprint } from "@ai-zoll/blueprint";
import type { ProjectBlueprint } from "@ai-zoll/blueprint";

export interface ProjectState {
  blueprint: ProjectBlueprint;
  /**
   * Every path produced by the most recent generation — not "the outgoing
   * agent's files". This set can also change from a Blueprint edit alone
   * (e.g. disabling all testing flags drops the testing skill), with no
   * agent switch involved. See run-sync.ts.
   */
  generatedPaths: string[];
}

const STATE_DIR = ".ai-zoll";
const STATE_FILE = "state.json";

/** Validates the outer shape only — `blueprint` is re-validated separately via safeParseBlueprint, so a version-mismatch failure can get its own clear message. */
const ProjectStateFileSchema = z.object({
  blueprint: z.unknown(),
  generatedPaths: z.array(z.string()),
});

function statePath(projectDir: string): string {
  return path.join(projectDir, STATE_DIR, STATE_FILE);
}

/**
 * Reads and validates `.ai-zoll/state.json`. Re-validates `blueprint` via
 * safeParseBlueprint on every read — never trust stored data blindly, even
 * the tool's own prior output, since a human can hand-edit this file (an
 * intended capability, not a risk to prevent).
 */
export function readProjectState(projectDir: string): ProjectState {
  const filePath = statePath(projectDir);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Not an ai-zoll project (no ${STATE_DIR}/${STATE_FILE} found in "${projectDir}") — run "ai-zoll init" first.`,
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error(
      `${STATE_DIR}/${STATE_FILE} is not valid JSON. Fix or delete it, or re-run "ai-zoll init".`,
    );
  }

  const shape = ProjectStateFileSchema.safeParse(parsedJson);
  if (!shape.success) {
    throw new Error(
      `${STATE_DIR}/${STATE_FILE} has an unexpected shape: ` +
        shape.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; "),
    );
  }

  const blueprintResult = safeParseBlueprint(shape.data.blueprint);
  if (!blueprintResult.success) {
    const versionIssue = blueprintResult.issues.find((issue) => issue.path === "version");
    if (versionIssue) {
      throw new Error(
        `This project's blueprint was created with a different ai-zoll version ` +
          `(${versionIssue.message}) — automatic migration isn't supported yet.`,
      );
    }
    throw new Error(
      `${STATE_DIR}/${STATE_FILE}'s blueprint failed validation: ` +
        blueprintResult.issues.map((issue) => `${issue.path || "(root)"}: ${issue.message}`).join("; "),
    );
  }

  return {
    blueprint: blueprintResult.data,
    generatedPaths: shape.data.generatedPaths,
  };
}

/**
 * Pretty-printed, trailing newline — meant to be committed to git and
 * human-diffable, like package.json. Written to a temp file then renamed
 * (atomic on POSIX filesystems) so a crash mid-write can't leave a
 * truncated state.json behind.
 */
export function writeProjectState(projectDir: string, state: ProjectState): void {
  const dir = path.join(projectDir, STATE_DIR);
  fs.mkdirSync(dir, { recursive: true });

  const finalPath = statePath(projectDir);
  const tmpPath = `${finalPath}.tmp-${process.pid}`;
  const content = `${JSON.stringify(state, null, 2)}\n`;

  fs.writeFileSync(tmpPath, content);
  fs.renameSync(tmpPath, finalPath);
}
