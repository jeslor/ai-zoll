import { z } from "zod";

/**
 * Fixed set matching the adapter directories under packages/agents/src/
 * (claude, cursor, codex, copilot, cline, zed — spec §9, §21). Adding a new
 * agent means adding a new AgentAdapter implementation, so gating this as
 * an enum is consistent with that reality rather than an arbitrary
 * restriction. cline/zed added per docs/decisions/0003-agent-adapter-
 * pattern.md's "Future adapter candidates" research.
 */
export const AgentIdSchema = z.enum(["claude", "cursor", "codex", "copilot", "cline", "zed"]);

export const AgentSchema = z.object({
  primary: AgentIdSchema,
});
