import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ProjectBlueprintSchema } from "@ai-zoll/blueprint";
import type { BlueprintValidationIssue } from "@ai-zoll/blueprint";
import type { BlueprintInput } from "../provider";

/**
 * Structured-output schema for the AI response: the canonical Blueprint
 * schema minus `version`, which the provider stamps itself (ADR 0002 — one
 * schema, no hand-duplicated JSON Schema to drift out of sync).
 */
export const BLUEPRINT_OUTPUT_SCHEMA = ProjectBlueprintSchema.omit({
  version: true,
});

export const BLUEPRINT_OUTPUT_FORMAT = zodOutputFormat(
  BLUEPRINT_OUTPUT_SCHEMA,
);

/**
 * System prompt establishing the AI/deterministic boundary from ADR 0004:
 * the user's explicit structural selections are fixed constraints, not
 * something the model may reinterpret. The model's actual job is the
 * open-ended part — `features` and light polish on `project.description`.
 * (ClaudeAIProvider.mergeCandidate also enforces this boundary in code —
 * this prompt keeps the model focused rather than being the only guard.)
 */
export function buildSystemPrompt(): string {
  return [
    "You are the AI Blueprint generator for AI Zoll.",
    "You are given a user's project description plus their explicit structural selections, and must return a complete Blueprint matching the provided schema.",
    "",
    "Hard constraints:",
    "- Return `project.name`, `project.type`, `architecture.style`, `stack.*`, `testing.*`, `security.*`, and `agent.primary` EXACTLY as given in the input. These are the user's explicit choices, not yours to reinterpret.",
    "- You MAY lightly polish `project.description` for clarity and grammar, but must preserve its original meaning and every fact it states. Do not invent details it doesn't imply.",
    "- You MUST produce a complete, coherent `features` array (each with `name` and `description`). If the user already listed features, keep and refine them. If their list is sparse or empty, add features a project matching this description and stack would reasonably need. Do not invent unrelated features.",
    "- Do not include any field not defined by the schema.",
  ].join("\n");
}

export function buildUserPrompt(input: BlueprintInput): string {
  return [
    "Generate the Blueprint for this project.",
    "",
    "Input (JSON):",
    JSON.stringify(input, null, 2),
  ].join("\n");
}

/**
 * Repair prompt: sent only when the first response failed canonical
 * validation (safeParseBlueprint can reject things the wire-level JSON
 * Schema can't express, e.g. `z.string().min(1)`). Asks the model to fix
 * exactly the reported issues, not regenerate from scratch.
 */
export function buildRepairPrompt(
  candidate: unknown,
  issues: BlueprintValidationIssue[],
): string {
  return [
    "Your previous response failed validation against the Blueprint schema.",
    "",
    "Previous response (JSON):",
    JSON.stringify(candidate, null, 2),
    "",
    "Validation issues to fix (path: message):",
    issues.map((issue) => `- ${issue.path || "(root)"}: ${issue.message}`).join("\n"),
    "",
    "Return a corrected, complete Blueprint fixing exactly these issues. Leave every other field unchanged.",
  ].join("\n");
}
