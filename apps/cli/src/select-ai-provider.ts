import { ClaudeAIProvider, MockAIProvider } from "@ai-software-zoll/ai";
import type { AIProvider } from "@ai-software-zoll/ai";

/**
 * Picks the real, LLM-backed provider when Claude credentials are available
 * (`ANTHROPIC_API_KEY`, matching the Anthropic SDK's own env convention),
 * otherwise falls back to the deterministic MockAIProvider so `init` still
 * works with zero setup. A one-line stderr notice on the fallback path keeps
 * that choice visible rather than silent.
 */
export function selectAIProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) {
    return new ClaudeAIProvider();
  }

  console.error(
    "No ANTHROPIC_API_KEY set — using MockAIProvider (deterministic, no AI-generated features).",
  );
  return new MockAIProvider();
}
