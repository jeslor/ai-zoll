import { describe, expect, it } from "vitest";
import {
  CUSTOM_ZONE_HINT,
  extractCustomZone,
  hasCustomContent,
  mergeManagedContent,
  wrapManaged,
} from "../managed-content";

describe("wrapManaged", () => {
  it("wraps content in the managed-region markers", () => {
    const wrapped = wrapManaged("hello");

    expect(wrapped).toBe(
      "<!-- ai-zoll:managed:start -->\nhello\n<!-- ai-zoll:managed:end -->\n",
    );
  });
});

describe("hasCustomContent", () => {
  it("is false for an empty string", () => {
    expect(hasCustomContent("")).toBe(false);
  });

  it("is false for whitespace only", () => {
    expect(hasCustomContent("   \n\n  ")).toBe(false);
  });

  it("is false when the zone contains only the one-time hint", () => {
    expect(hasCustomContent(`${CUSTOM_ZONE_HINT}\n`)).toBe(false);
  });

  it("is true when there's real content alongside the hint", () => {
    expect(hasCustomContent(`${CUSTOM_ZONE_HINT}\n\n## My notes\nSomething real.`)).toBe(
      true,
    );
  });

  it("is true when there's real content and no hint at all", () => {
    expect(hasCustomContent("## My notes\nSomething real.")).toBe(true);
  });
});

describe("extractCustomZone", () => {
  it("returns null with a detail when no markers are present at all", () => {
    const result = extractCustomZone("# Hand-written CLAUDE.md\n\nSome content.");

    expect(result.customZone).toBeNull();
    expect((result as { detail: string }).detail).toMatch(/no managed markers/);
  });

  it("returns null with a detail when only the start marker is present", () => {
    const result = extractCustomZone("<!-- ai-zoll:managed:start -->\nfoo");

    expect(result.customZone).toBeNull();
    expect((result as { detail: string }).detail).toMatch(/malformed/);
  });

  it("returns null with a detail when only the end marker is present", () => {
    const result = extractCustomZone("foo\n<!-- ai-zoll:managed:end -->\n");

    expect(result.customZone).toBeNull();
    expect((result as { detail: string }).detail).toMatch(/malformed/);
  });

  it("returns null when the end marker appears before the start marker", () => {
    const result = extractCustomZone(
      "<!-- ai-zoll:managed:end -->\n<!-- ai-zoll:managed:start -->\n",
    );

    expect(result.customZone).toBeNull();
  });

  it("extracts everything after the end marker when well-formed", () => {
    const existing = wrapManaged("generated body") + "custom notes here";

    const result = extractCustomZone(existing);

    expect(result.customZone).toBe("custom notes here");
  });

  it("uses the first marker pair when markers appear more than once", () => {
    const existing =
      wrapManaged("generated body") +
      "some notes, including an example:\n\n" +
      wrapManaged("copy-pasted example block");

    const result = extractCustomZone(existing);

    expect(result.customZone).toBe(
      "some notes, including an example:\n\n" + wrapManaged("copy-pasted example block"),
    );
  });

  it("doesn't get confused by marker-like text inside a code fence in the custom zone", () => {
    const existing =
      wrapManaged("generated body") +
      "```\n<!-- ai-zoll:managed:start -->\nexample\n<!-- ai-zoll:managed:end -->\n```\n";

    const result = extractCustomZone(existing);

    expect(result.customZone).toContain("```\n<!-- ai-zoll:managed:start -->");
  });
});

describe("mergeManagedContent", () => {
  it("creates a fresh file with the hint line when there's no existing content", () => {
    const result = mergeManagedContent(undefined, "fresh body");

    expect(result.status).toBe("created");
    expect(result.content).toBe(
      wrapManaged("fresh body") + CUSTOM_ZONE_HINT + "\n",
    );
  });

  it("regenerates the managed block and preserves a non-empty custom zone verbatim", () => {
    const existing = wrapManaged("old body") + `${CUSTOM_ZONE_HINT}\n\n## Notes\nreal stuff`;

    const result = mergeManagedContent(existing, "new body");

    expect(result.status).toBe("regenerated");
    expect(result.content).toBe(
      wrapManaged("new body") + `${CUSTOM_ZONE_HINT}\n\n## Notes\nreal stuff`,
    );
  });

  it("regenerates cleanly when the custom zone only ever had the hint line", () => {
    const existing = wrapManaged("old body") + `${CUSTOM_ZONE_HINT}\n`;

    const result = mergeManagedContent(existing, "new body");

    expect(result.status).toBe("regenerated");
    expect(result.content).toBe(wrapManaged("new body") + `${CUSTOM_ZONE_HINT}\n`);
  });

  it("leaves unrecognized content completely untouched", () => {
    const existing = "# Hand-written CLAUDE.md, predates ai-zoll\n\nDon't touch this.";

    const result = mergeManagedContent(existing, "new body");

    expect(result.status).toBe("unrecognized");
    expect(result.content).toBe(existing);
    expect(result.detail).toMatch(/no managed markers/);
  });

  it("leaves malformed-marker content untouched with a distinct detail", () => {
    const existing = wrapManaged("old body").replace("managed:end", "MANAGED:END");

    const result = mergeManagedContent(existing, "new body");

    expect(result.status).toBe("unrecognized");
    expect(result.detail).toMatch(/malformed/);
  });

  it("is deterministic: the same inputs always produce the same output", () => {
    const existing = wrapManaged("old body") + "custom stuff";

    const first = mergeManagedContent(existing, "new body");
    const second = mergeManagedContent(existing, "new body");

    expect(first).toEqual(second);
  });
});
