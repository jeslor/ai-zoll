import { describe, expect, it } from "vitest";
import { ClaudeAdapter } from "../claude/claude-adapter";
import { CursorAdapter } from "../cursor/cursor-adapter";
import { CodexAdapter } from "../codex/codex-adapter";
import { CopilotAdapter } from "../copilot/copilot-adapter";
import { getAgentAdapter, SUPPORTED_AGENT_IDS } from "../get-agent-adapter";

describe("getAgentAdapter", () => {
  it("lists exactly the four agents with a real adapter", () => {
    expect(SUPPORTED_AGENT_IDS).toEqual(["claude", "cursor", "codex", "copilot"]);
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

  it("returns a CopilotAdapter for 'copilot'", () => {
    expect(getAgentAdapter("copilot")).toBeInstanceOf(CopilotAdapter);
  });
});
