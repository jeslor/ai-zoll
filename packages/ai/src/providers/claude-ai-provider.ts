import Anthropic from "@anthropic-ai/sdk";
import {
  CURRENT_BLUEPRINT_VERSION,
  safeParseBlueprint,
  BlueprintValidationError,
  type ProjectBlueprint,
} from "@ai-zoll/blueprint";
import type { AIProvider, BlueprintInput } from "../provider";
import {
  BLUEPRINT_OUTPUT_FORMAT,
  buildRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "../prompts/blueprint-prompt";

const DEFAULT_MODEL = "claude-opus-4-8";
const MAX_TOKENS = 4096;
/** One initial attempt plus one repair round (spec: "retry or repair" — not open-ended). */
const MAX_ATTEMPTS = 2;

export interface ClaudeAIProviderOptions {
  /** Injectable for tests; defaults to `new Anthropic()` (reads ANTHROPIC_API_KEY/profile). */
  client?: Anthropic;
  model?: string;
}

/**
 * Real, LLM-backed AIProvider (spec §33/§48 step 8; roadmap Phase 4).
 *
 * Per ADR 0004, the model's job is bounded: it does real interpretive work
 * only on `features` and `project.description` (light polish). Every other
 * field — `project.name`/`type`, `architecture`, `stack`, `testing`,
 * `security`, `agent` — is enforced in code from the user's original input,
 * not merely requested via prompt (see `mergeCandidate`): the model cannot
 * silently reinterpret an explicit user selection.
 *
 * Every merged candidate — first attempt and repair attempt — is validated
 * via the same safeParseBlueprint/BlueprintValidationError pipeline
 * MockAIProvider uses (Rule 9: never let an LLM response bypass schema
 * validation).
 */
export class ClaudeAIProvider implements AIProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: ClaudeAIProviderOptions = {}) {
    this.client = options.client ?? new Anthropic();
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async generateBlueprint(input: BlueprintInput): Promise<ProjectBlueprint> {
    let aiOutput = await this.request(buildUserPrompt(input));
    let candidate = this.mergeCandidate(input, aiOutput);
    let result = safeParseBlueprint(candidate);

    for (let attempt = 1; !result.success && attempt < MAX_ATTEMPTS; attempt++) {
      aiOutput = await this.request(buildRepairPrompt(candidate, result.issues));
      candidate = this.mergeCandidate(input, aiOutput);
      result = safeParseBlueprint(candidate);
    }

    if (!result.success) {
      throw new BlueprintValidationError(result.issues);
    }

    return result.data;
  }

  /**
   * Takes the model's output for the fields it's allowed to touch
   * (`features`, `project.description`) and the user's original input for
   * everything else — the code-level enforcement of the ADR 0004 boundary.
   */
  private mergeCandidate(input: BlueprintInput, aiOutput: unknown): unknown {
    const ai =
      aiOutput && typeof aiOutput === "object"
        ? (aiOutput as Record<string, unknown>)
        : {};
    const aiProject =
      ai.project && typeof ai.project === "object"
        ? (ai.project as Record<string, unknown>)
        : {};

    return {
      version: CURRENT_BLUEPRINT_VERSION,
      project: {
        ...input.project,
        description:
          typeof aiProject.description === "string"
            ? aiProject.description
            : input.project.description,
      },
      architecture: input.architecture,
      stack: input.stack,
      testing: input.testing,
      security: input.security,
      agent: input.agent,
      features: Array.isArray(ai.features) ? ai.features : input.features,
    };
  }

  private async request(userPrompt: string): Promise<unknown> {
    const message = await this.client.messages.parse({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(),
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: BLUEPRINT_OUTPUT_FORMAT,
      },
      messages: [{ role: "user", content: userPrompt }],
    });

    return message.parsed_output ?? {};
  }
}
