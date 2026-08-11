import { describe, expect, it } from "vitest";
import { ClaudeAdapter, CursorAdapter, CodexAdapter } from "@ai-zoll/agents";
import { getAgentAdapter, SUPPORTED_AGENT_IDS } from "../agent-adapters";

describe("getAgentAdapter", () => {
  it("lists exactly the three agents with a real adapter", () => {
    expect(SUPPORTED_AGENT_IDS).toEqual(["claude", "cursor", "codex"]);
  });

  it("returns a ClaudeAdapter for 'claude'", () => {
    expect(getAgentAdapter("claude")).toBeInstanceOf(ClaudeAdapter);
  });

  it("returns a CursorAdapter for 'cursor'", () => {
    expect(getAgentAdapter("cursor")).toBeInstanceOf(CursorAdapter);
  });

  it("returns a CodexAdapter for 'codex'", () => {
    expect(getAgentAdapter("codex")).toBeInstanceOf(CodexAdapter);
  });
});
