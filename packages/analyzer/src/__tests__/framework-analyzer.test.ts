import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../__fixtures__/make-fixture-repo";
import { analyzeFramework } from "../framework-analyzer";

let tempDirs: string[] = [];

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function seed(files: Record<string, string>): string {
  const dir = makeFixtureRepo(files);
  tempDirs.push(dir);
  return dir;
}

describe("analyzeFramework", () => {
  it("detects NestJS as backend, no frontend signal", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        name: "acme-api",
        dependencies: { "@nestjs/core": "^10.0.0", "@nestjs/common": "^10.0.0" },
        devDependencies: { jest: "^29.0.0" },
      }),
    });

    const result = analyzeFramework(dir);

    expect(result.backend).toEqual({
      value: "nestjs",
      confidence: "detected",
      reason: expect.stringContaining("@nestjs/core"),
    });
    expect(result.frontend.confidence).toBe("unknown");
  });

  it("detects Next.js, not react, even though react is also present as a transitive-style dep", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        name: "marketing-site",
        dependencies: { next: "^14.2.0", react: "^18.3.0", "react-dom": "^18.3.0" },
        devDependencies: { typescript: "^5.4.0", vitest: "^1.5.0" },
      }),
    });

    const result = analyzeFramework(dir);

    expect(result.frontend.value).toBe("nextjs");
    expect(result.backend.confidence).toBe("unknown");
  });

  it("detects plain React when Next.js isn't present", () => {
    const dir = seed({
      "package.json": JSON.stringify({ dependencies: { react: "^18.3.0" } }),
    });

    expect(analyzeFramework(dir).frontend.value).toBe("react");
  });

  it("detects Vue and Angular", () => {
    const vueDir = seed({ "package.json": JSON.stringify({ dependencies: { vue: "^3.4.0" } }) });
    expect(analyzeFramework(vueDir).frontend.value).toBe("vue");

    const angularDir = seed({
      "package.json": JSON.stringify({ dependencies: { "@angular/core": "^17.0.0" } }),
    });
    expect(analyzeFramework(angularDir).frontend.value).toBe("angular");
  });

  it("detects Express and Fastify", () => {
    const expressDir = seed({ "package.json": JSON.stringify({ dependencies: { express: "^4.19.0" } }) });
    expect(analyzeFramework(expressDir).backend.value).toBe("express");

    const fastifyDir = seed({ "package.json": JSON.stringify({ dependencies: { fastify: "^4.26.0" } }) });
    expect(analyzeFramework(fastifyDir).backend.value).toBe("fastify");
  });

  it("returns unknown for a monorepo root with no recognized dependencies", () => {
    const dir = seed({
      "package.json": JSON.stringify({
        name: "acme-monorepo",
        private: true,
        workspaces: ["apps/*", "packages/*"],
        devDependencies: { turbo: "^2.0.0", typescript: "^5.4.0" },
      }),
    });

    const result = analyzeFramework(dir);

    expect(result.frontend.confidence).toBe("unknown");
    expect(result.backend.confidence).toBe("unknown");
  });

  it("returns unknown when there's no package.json at all", () => {
    const dir = seed({});

    const result = analyzeFramework(dir);

    expect(result.frontend.confidence).toBe("unknown");
    expect(result.backend.confidence).toBe("unknown");
  });
});
