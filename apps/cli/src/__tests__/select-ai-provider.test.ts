import { describe, expect, it, afterEach, vi } from "vitest";
import { ClaudeAIProvider, MockAIProvider } from "@ai-software-zoll/ai";
import { selectAIProvider } from "../select-ai-provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("selectAIProvider", () => {
  it("returns MockAIProvider when ANTHROPIC_API_KEY is unset", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(selectAIProvider()).toBeInstanceOf(MockAIProvider);
  });

  it("logs a notice to stderr when falling back to MockAIProvider", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    selectAIProvider();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("MockAIProvider"));
  });

  it("returns ClaudeAIProvider when ANTHROPIC_API_KEY is set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");

    expect(selectAIProvider()).toBeInstanceOf(ClaudeAIProvider);
  });
});
