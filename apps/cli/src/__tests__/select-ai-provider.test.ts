import { describe, expect, it, afterEach, vi } from "vitest";
import { ClaudeAIProvider, MockAIProvider } from "@ai-zoll/ai";
import { selectAIProvider } from "../select-ai-provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("selectAIProvider", () => {
  it("returns MockAIProvider by default when ANTHROPIC_API_KEY is unset", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    expect(selectAIProvider(false)).toBeInstanceOf(MockAIProvider);
  });

  it("returns MockAIProvider by default even when ANTHROPIC_API_KEY is set — --ai is required", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(selectAIProvider(false)).toBeInstanceOf(MockAIProvider);
  });

  it("logs a discoverability notice when a key is set but --ai wasn't passed", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    selectAIProvider(false);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("--ai"));
  });

  it("does not log anything when no key is set and --ai wasn't passed", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    selectAIProvider(false);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns ClaudeAIProvider when --ai is passed and ANTHROPIC_API_KEY is set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");

    expect(selectAIProvider(true)).toBeInstanceOf(ClaudeAIProvider);
  });

  it("throws when --ai is passed but ANTHROPIC_API_KEY is unset", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    expect(() => selectAIProvider(true)).toThrow(/ANTHROPIC_API_KEY/);
  });
});
