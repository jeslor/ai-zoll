import { z } from "zod";

/**
 * Fixed set matching the 4 adapter directories under packages/agents/src/
 * (claude, cursor, codex, copilot — spec §9, §21). Adding a 5th agent means
 * adding a new AgentAdapter implementation, so gating this as an enum is
 * consistent with that reality rather than an arbitrary restriction.
 */
export const AgentIdSchema = z.enum(["claude", "cursor", "codex", "copilot"]);

export const AgentSchema = z.object({
  primary: AgentIdSchema,
});
