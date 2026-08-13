import { ClaudeAIProvider, MockAIProvider } from "@ai-zoll/ai";
import type { AIProvider } from "@ai-zoll/ai";

/**
 * MockAIProvider (deterministic, zero network calls) is the only default —
 * the real, LLM-backed ClaudeAIProvider is opt-in only, via `useAI`, never
 * auto-triggered just because ANTHROPIC_API_KEY happens to be set in the
 * shell. Explicit `--ai` + no key throws rather than silently degrading to
 * Mock, since silently substituting a different provider than the one
 * explicitly requested would be a worse surprise than an error.
 */
export function selectAIProvider(useAI: boolean): AIProvider {
  if (useAI) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("--ai requires ANTHROPIC_API_KEY to be set.");
    }
    return new ClaudeAIProvider();
  }

  if (process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is set but not used — pass --ai to enable AI-assisted feature generation.",
    );
  }
  return new MockAIProvider();
}
