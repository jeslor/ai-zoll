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

  it("detects Koa, Hapi, and Hono", () => {
    expect(analyzeFramework(seed({ "package.json": JSON.stringify({ dependencies: { koa: "^2.15.0" } }) })).backend.value).toBe("koa");
    expect(
      analyzeFramework(seed({ "package.json": JSON.stringify({ dependencies: { "@hapi/hapi": "^21.3.0" } }) }))
        .backend.value,
    ).toBe("hapi");
    expect(analyzeFramework(seed({ "package.json": JSON.stringify({ dependencies: { hono: "^4.0.0" } }) })).backend.value).toBe("hono");
  });

  it("detects Nuxt, not plain vue, even though vue is also present as a transitive-style dep", () => {
    const dir = seed({
      "package.json": JSON.stringify({ dependencies: { nuxt: "^3.11.0", vue: "^3.4.0" } }),
    });

    expect(analyzeFramework(dir).frontend.value).toBe("nuxt");
  });

  it("detects SvelteKit, not plain svelte, even though svelte is also present", () => {
    const dir = seed({
      "package.json": JSON.stringify({ devDependencies: { "@sveltejs/kit": "^2.5.0", svelte: "^4.2.0" } }),
    });

    expect(analyzeFramework(dir).frontend.value).toBe("sveltekit");
  });

  it("detects Remix, not plain react, even though react is also present", () => {
    const dir = seed({
      "package.json": JSON.stringify({ dependencies: { "@remix-run/react": "^2.9.0", react: "^18.3.0" } }),
    });

    expect(analyzeFramework(dir).frontend.value).toBe("remix");
  });

  it("detects Astro and plain Svelte", () => {
    expect(
      analyzeFramework(seed({ "package.json": JSON.stringify({ dependencies: { astro: "^4.7.0" } }) }))
        .frontend.value,
    ).toBe("astro");
    expect(
      analyzeFramework(seed({ "package.json": JSON.stringify({ dependencies: { svelte: "^4.2.0" } }) }))
        .frontend.value,
    ).toBe("svelte");
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

  it("detects backend frameworks from non-Node ecosystems", () => {
    const django = seed({ "requirements.txt": "django==4.2.0\n" });
    expect(analyzeFramework(django).backend.value).toBe("django");

    const fastapi = seed({ "requirements.txt": "fastapi>=0.100\n" });
    expect(analyzeFramework(fastapi).backend.value).toBe("fastapi");

    const spring = seed({
      "pom.xml":
        "<project><dependencies><dependency><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>",
    });
    expect(analyzeFramework(spring).backend.value).toBe("spring-boot");

    // Spring Boot 4 renamed the starter to "-webmvc" — found dogfooding
    // against a real Spring Boot 4 app (spring-petclinic) that only had
    // this newer name, missing it entirely under the old-name-only signal.
    const springBoot4 = seed({
      "build.gradle": "dependencies {\n  implementation 'org.springframework.boot:spring-boot-starter-webmvc'\n}",
    });
    expect(analyzeFramework(springBoot4).backend.value).toBe("spring-boot");

    const actix = seed({ "Cargo.toml": '[dependencies]\nactix-web = "4"\n' });
    expect(analyzeFramework(actix).backend.value).toBe("actix-web");

    const gin = seed({
      "go.mod": "module acme\n\nrequire github.com/gin-gonic/gin v1.9.1\n",
    });
    expect(analyzeFramework(gin).backend.value).toBe("gin");

    const rails = seed({ Gemfile: 'gem "rails", "~> 7.0"\n' });
    expect(analyzeFramework(rails).backend.value).toBe("rails");

    const laravel = seed({
      "composer.json": JSON.stringify({ require: { "laravel/framework": "^10.0" } }),
    });
    expect(analyzeFramework(laravel).backend.value).toBe("laravel");

    const aspnet = seed({ "App.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>' });
    expect(analyzeFramework(aspnet).backend.value).toBe("aspnet");
  });
});
