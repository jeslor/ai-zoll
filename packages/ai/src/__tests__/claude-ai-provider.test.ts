import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { CURRENT_BLUEPRINT_VERSION, BlueprintValidationError } from "@ai-zoll/blueprint";
import { ClaudeAIProvider } from "../providers/claude-ai-provider";
import type { BlueprintInput } from "../provider";
import validInput from "./fixtures/valid-blueprint-input.json";

/** Minimal fake matching only the surface ClaudeAIProvider actually calls. */
function fakeClient(parse: (...args: unknown[]) => unknown): Anthropic {
  return { messages: { parse } } as unknown as Anthropic;
}

const input = validInput as BlueprintInput;

describe("ClaudeAIProvider.generateBlueprint", () => {
  it("returns a validated Blueprint with the current version stamped, from a well-formed first response", async () => {
    const parse = vi.fn().mockResolvedValue({
      parsed_output: {
        project: { ...input.project, description: "A polished description." },
        architecture: input.architecture,
        stack: input.stack,
        features: [{ name: "Onboarding", description: "Guided setup for new schools." }],
        testing: input.testing,
        security: input.security,
        agent: input.agent,
      },
    });

    const provider = new ClaudeAIProvider({ client: fakeClient(parse) });
    const blueprint = await provider.generateBlueprint(input);

    expect(blueprint.version).toBe(CURRENT_BLUEPRINT_VERSION);
    expect(blueprint.project.description).toBe("A polished description.");
    expect(blueprint.features).toEqual([
      { name: "Onboarding", description: "Guided setup for new schools." },
    ]);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("ignores AI-supplied structural fields and uses the user's original input instead", async () => {
    const parse = vi.fn().mockResolvedValue({
      parsed_output: {
        project: { name: "Renamed By AI", description: input.project.description, type: "cli" },
        architecture: { style: "hexagonal" },
        stack: { frontend: "vue", backend: "django", database: "mysql", orm: "sqlalchemy" },
        features: input.features,
        testing: { unit: false, integration: false, e2e: false },
        security: { authentication: "oauth", authorization: "acl" },
        agent: { primary: "cursor" },
      },
    });

    const provider = new ClaudeAIProvider({ client: fakeClient(parse) });
    const blueprint = await provider.generateBlueprint(input);

    expect(blueprint.project.name).toBe(input.project.name);
    expect(blueprint.project.type).toBe(input.project.type);
    expect(blueprint.architecture).toEqual(input.architecture);
    expect(blueprint.stack).toEqual(input.stack);
    expect(blueprint.testing).toEqual(input.testing);
    expect(blueprint.security).toEqual(input.security);
    expect(blueprint.agent).toEqual(input.agent);
  });

  it("repairs once when the first response fails validation, and succeeds on the second attempt", async () => {
    const parse = vi
      .fn()
      .mockResolvedValueOnce({
        parsed_output: {
          project: { ...input.project, description: "" },
          architecture: input.architecture,
          stack: input.stack,
          features: input.features,
          testing: input.testing,
          security: input.security,
          agent: input.agent,
        },
      })
      .mockResolvedValueOnce({
        parsed_output: {
          project: { ...input.project, description: "A valid, non-empty description." },
          architecture: input.architecture,
          stack: input.stack,
          features: input.features,
          testing: input.testing,
          security: input.security,
          agent: input.agent,
        },
      });

    const provider = new ClaudeAIProvider({ client: fakeClient(parse) });
    const blueprint = await provider.generateBlueprint(input);

    expect(blueprint.project.description).toBe("A valid, non-empty description.");
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("throws BlueprintValidationError with the latest issues when repair also fails", async () => {
    const invalidResponse = {
      parsed_output: {
        project: { ...input.project, description: "" },
        architecture: input.architecture,
        stack: input.stack,
        features: input.features,
        testing: input.testing,
        security: input.security,
        agent: input.agent,
      },
    };
    const parse = vi.fn().mockResolvedValue(invalidResponse);

    const provider = new ClaudeAIProvider({ client: fakeClient(parse) });

    let caught: unknown;
    try {
      await provider.generateBlueprint(input);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BlueprintValidationError);
    const validationError = caught as BlueprintValidationError;
    expect(
      validationError.issues.some((issue) => issue.path === "project.description"),
    ).toBe(true);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("treats a null parsed_output as no AI contribution, falling back to the (valid) user input", async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: null });

    const provider = new ClaudeAIProvider({ client: fakeClient(parse) });
    const blueprint = await provider.generateBlueprint(input);

    expect(blueprint.project.name).toBe(input.project.name);
    expect(blueprint.project.description).toBe(input.project.description);
    expect(blueprint.features).toEqual(input.features);
    // Falling back to the user's own (already-valid) input succeeds on the
    // first attempt — no repair round needed.
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("still repairs when a null parsed_output leaves an invalid candidate (empty-features input)", async () => {
    const sparseInput: BlueprintInput = {
      ...input,
      features: [],
      project: { ...input.project, description: "" },
    };
    const parse = vi
      .fn()
      .mockResolvedValueOnce({ parsed_output: null })
      .mockResolvedValueOnce({
        parsed_output: {
          project: { ...input.project, description: "A valid description." },
          architecture: input.architecture,
          stack: input.stack,
          features: [{ name: "Core", description: "Core functionality." }],
          testing: input.testing,
          security: input.security,
          agent: input.agent,
        },
      });

    const provider = new ClaudeAIProvider({ client: fakeClient(parse) });
    const blueprint = await provider.generateBlueprint(sparseInput);

    expect(blueprint.project.description).toBe("A valid description.");
    expect(blueprint.features).toEqual([{ name: "Core", description: "Core functionality." }]);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("passes the configured model through to the API call", async () => {
    const parse = vi.fn().mockResolvedValue({
      parsed_output: {
        project: input.project,
        architecture: input.architecture,
        stack: input.stack,
        features: input.features,
        testing: input.testing,
        security: input.security,
        agent: input.agent,
      },
    });

    const provider = new ClaudeAIProvider({
      client: fakeClient(parse),
      model: "claude-sonnet-5",
    });
    await provider.generateBlueprint(input);

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-5" }),
    );
  });
});
