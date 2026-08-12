import { describe, expect, it, vi, afterEach } from "vitest";
import type { ProjectBlueprint } from "@ai-zoll/blueprint";
import { registerWithApi } from "../register-with-api";

const blueprint: ProjectBlueprint = {
  version: "1.0",
  project: {
    name: "School Management Platform",
    description: "A platform for schools to manage students, teachers and payments.",
    type: "saas",
  },
  architecture: { style: "modular" },
  stack: {
    frontend: "nextjs",
    backend: "nestjs",
    database: "postgresql",
    orm: "prisma",
  },
  features: [{ name: "Students", description: "Manage student records" }],
  testing: { unit: true, integration: true, e2e: true },
  security: { authentication: "jwt", authorization: "rbac" },
  agent: { primary: "claude" },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("registerWithApi", () => {
  it("returns null without calling fetch when AI_ZOLL_API_URL is unset", async () => {
    vi.stubEnv("AI_ZOLL_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await registerWithApi(blueprint);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the project then the blueprint and returns the project id on success", async () => {
    vi.stubEnv("AI_ZOLL_API_URL", "http://localhost:3000");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: "p1" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await registerWithApi(blueprint);

    expect(result).toBe("p1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/projects",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: blueprint.project.name }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/projects/p1/blueprint",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(blueprint),
      }),
    );
  });

  it("returns null without throwing when the first request fails (non-2xx)", async () => {
    vi.stubEnv("AI_ZOLL_API_URL", "http://localhost:3000");
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await registerWithApi(blueprint);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null without throwing when fetch rejects (network error)", async () => {
    vi.stubEnv("AI_ZOLL_API_URL", "http://localhost:3000");
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await registerWithApi(blueprint);

    expect(result).toBeNull();
  });
});
