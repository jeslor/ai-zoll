import { describe, expect, it } from "vitest";
import { mergeArray, mergeBoolean, mergeCategorical } from "../merge-findings";
import type { Finding } from "../finding";

function detected<T>(value: T, reason = "detected"): Finding<T> {
  return { value, confidence: "detected", reason };
}
function likely<T>(value: T, reason = "likely"): Finding<T> {
  return { value, confidence: "likely", reason };
}
function unknown<T>(reason = "unknown"): Finding<T> {
  return { value: null, confidence: "unknown", reason };
}

describe("mergeCategorical", () => {
  it("passes through a single source's finding completely unchanged", () => {
    const finding = detected("nextjs", "found \"next\" in dependencies");
    const result = mergeCategorical<string>([{ source: "root", finding }]);

    expect(result).toBe(finding); // same object, not just equal — true passthrough
  });

  it("uses the value directly when only one source contributed a real finding among several checked", () => {
    const result = mergeCategorical<string>([
      { source: "root", finding: unknown() },
      { source: "apps/web", finding: detected("nextjs") },
      { source: "packages/blueprint", finding: unknown() },
    ]);

    expect(result.value).toBe("nextjs");
    expect(result.confidence).toBe("detected");
  });

  it("excludes unknown-confidence sources from voting (a frameworkless library subpackage is a non-vote, not a disagreement)", () => {
    const result = mergeCategorical<string>([
      { source: "root", finding: unknown() },
      { source: "apps/api", finding: detected("nestjs") },
      { source: "packages/blueprint", finding: unknown() },
      { source: "packages/shared", finding: unknown() },
    ]);

    expect(result.value).toBe("nestjs");
    expect(result.confidence).toBe("detected");
  });

  it("notes corroboration when multiple sources agree", () => {
    const result = mergeCategorical<string>([
      { source: "root", finding: unknown() },
      { source: "apps/web", finding: detected("nextjs") },
      { source: "apps/docs", finding: likely("nextjs") },
    ]);

    expect(result.value).toBe("nextjs");
    expect(result.confidence).toBe("detected"); // best among agreeing
    expect(result.reason).toContain("corroborated");
    expect(result.reason).toContain("apps/docs");
  });

  it("reports unknown with every source's value enumerated when sources disagree", () => {
    const result = mergeCategorical<string>([
      { source: "root", finding: unknown() },
      { source: "apps/web", finding: detected("nextjs") },
      { source: "apps/marketing", finding: detected("astro") },
    ]);

    expect(result.confidence).toBe("unknown");
    expect(result.value).toBeNull();
    expect(result.reason).toContain("apps/web: nextjs");
    expect(result.reason).toContain("apps/marketing: astro");
  });

  it("does not majority-vote — even 2-vs-1 disagreement reports unknown, not the majority value", () => {
    const result = mergeCategorical<string>([
      { source: "apps/web", finding: detected("nextjs") },
      { source: "apps/docs", finding: detected("nextjs") },
      { source: "apps/marketing", finding: detected("astro") },
    ]);

    expect(result.confidence).toBe("unknown");
  });

  it("reports unknown when nothing found anywhere", () => {
    const result = mergeCategorical<string>([
      { source: "root", finding: unknown() },
      { source: "apps/web", finding: unknown() },
    ]);

    expect(result.confidence).toBe("unknown");
    expect(result.value).toBeNull();
  });
});

describe("mergeCategorical with a specializes map", () => {
  const FRONTEND_SPECIALIZES = { nextjs: "react", nuxt: "vue" };

  it("resolves a meta-framework + its own base library to the meta-framework, not unknown", () => {
    const result = mergeCategorical<string>(
      [
        { source: "apps/web", finding: detected("nextjs") },
        { source: "packages/app-store-cli", finding: detected("react") },
      ],
      FRONTEND_SPECIALIZES,
    );

    expect(result.value).toBe("nextjs");
    expect(result.confidence).toBe("detected");
    expect(result.reason).toContain("react");
    expect(result.reason).toContain("packages/app-store-cli");
  });

  it("still reports unknown when the disagreement isn't explained by the specialization map (a genuinely different framework family)", () => {
    const result = mergeCategorical<string>(
      [
        { source: "apps/web", finding: detected("nextjs") },
        { source: "examples/nuxt", finding: detected("nuxt") },
      ],
      FRONTEND_SPECIALIZES,
    );

    expect(result.confidence).toBe("unknown");
    expect(result.value).toBeNull();
  });

  it("still reports unknown when a meta-framework appears alongside an unrelated base value it doesn't imply", () => {
    const result = mergeCategorical<string>(
      [
        { source: "apps/web", finding: detected("nextjs") },
        { source: "packages/vue-widget", finding: detected("vue") },
      ],
      FRONTEND_SPECIALIZES,
    );

    expect(result.confidence).toBe("unknown");
    expect(result.value).toBeNull();
  });

  it("is a no-op when every source already agrees (nothing to resolve)", () => {
    const result = mergeCategorical<string>(
      [
        { source: "apps/web", finding: detected("nextjs") },
        { source: "apps/docs", finding: detected("nextjs") },
      ],
      FRONTEND_SPECIALIZES,
    );

    expect(result.value).toBe("nextjs");
  });

  it("without a specializes argument, behaves exactly as before (real disagreement, unknown)", () => {
    const result = mergeCategorical<string>([
      { source: "apps/web", finding: detected("nextjs") },
      { source: "packages/app-store-cli", finding: detected("react") },
    ]);

    expect(result.confidence).toBe("unknown");
  });
});

describe("mergeBoolean", () => {
  it("passes through a single source's finding completely unchanged", () => {
    const finding = detected(true, "found vitest");
    expect(mergeBoolean([{ source: "root", finding }])).toBe(finding);
  });

  it("is true if found true anywhere, with per-source coverage in the reason (not just the positive source)", () => {
    const result = mergeBoolean([
      { source: "apps/api", finding: detected(true, "found vitest") },
      { source: "apps/web", finding: detected(false) },
    ]);

    expect(result.value).toBe(true);
    expect(result.reason).toContain("apps/api: yes");
    expect(result.reason).toContain("apps/web: no");
  });

  it("is false only when every non-unknown source confidently reports false", () => {
    const result = mergeBoolean([
      { source: "apps/api", finding: detected(false) },
      { source: "apps/web", finding: detected(false) },
    ]);

    expect(result).toEqual({ value: false, confidence: "detected", reason: expect.any(String) });
  });

  it("excludes unknown sources rather than treating them as false", () => {
    const result = mergeBoolean([
      { source: "apps/api", finding: detected(false) },
      { source: "packages/blueprint", finding: unknown() },
    ]);

    expect(result.value).toBe(false);
    expect(result.reason).not.toContain("packages/blueprint");
  });

  it("reports unknown when nothing found anywhere", () => {
    const result = mergeBoolean([
      { source: "root", finding: unknown() },
      { source: "apps/web", finding: unknown() },
    ]);

    expect(result.confidence).toBe("unknown");
  });
});

describe("mergeArray", () => {
  it("passes through a single source's finding completely unchanged", () => {
    const finding = detected(["domain", "application"], "found directories");
    expect(mergeArray([{ source: "root", finding }])).toBe(finding);
  });

  it("unions and dedupes signals across sources rather than treating differences as a conflict", () => {
    const result = mergeArray([
      { source: "apps/api", finding: detected(["controllers", "services"]) },
      { source: "apps/web", finding: detected(["components", "hooks"]) },
    ]);

    expect(result.confidence).toBe("detected");
    expect(result.value?.sort()).toEqual(["components", "controllers", "hooks", "services"]);
  });

  it("dedupes an overlapping signal found in multiple sources", () => {
    const result = mergeArray([
      { source: "apps/api", finding: detected(["controllers", "services"]) },
      { source: "apps/worker", finding: detected(["services"]) },
    ]);

    expect(result.value).toEqual(["controllers", "services"]);
  });

  it("reports unknown when nothing found anywhere", () => {
    const result = mergeArray([
      { source: "root", finding: unknown() },
      { source: "apps/web", finding: unknown() },
    ]);

    expect(result.confidence).toBe("unknown");
    expect(result.value).toBeNull();
  });
});
