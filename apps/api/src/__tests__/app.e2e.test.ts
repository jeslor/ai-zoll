import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

const validBlueprint = {
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

/**
 * In-memory HTTP e2e: real routing/pipes/status codes via NestJS's testing
 * module + supertest, with PrismaService faked — no real database needed.
 * This is the seam that actually matters for a REST API (unlike prior
 * packages, where pure-function unit tests were the right level).
 */
function fakePrismaService() {
  return {
    project: {
      create: vi.fn().mockResolvedValue({ id: "p1", name: "My App" }),
      findMany: vi.fn().mockResolvedValue([{ id: "p1", name: "My App" }]),
      findUnique: vi.fn().mockImplementation(({ where: { id } }) =>
        id === "p1" ? { id: "p1", name: "My App" } : null,
      ),
    },
    blueprintVersion: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
    },
    projectBlueprint: {
      upsert: vi
        .fn()
        .mockResolvedValue({ projectId: "p1", data: validBlueprint }),
      findUnique: vi.fn().mockImplementation(({ where: { projectId } }) =>
        projectId === "p1" ? { projectId: "p1", data: validBlueprint } : null,
      ),
    },
    agent: {
      upsert: vi.fn().mockResolvedValue({ projectId: "p1", primary: "claude" }),
    },
    generatedArtifact: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: "a1", projectId: "p1", path: "PROJECT.md", content: "..." },
        ]),
    },
  };
}

let app: INestApplication;

beforeEach(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(fakePrismaService())
    .compile();

  app = moduleRef.createNestApplication();
  await app.init();
});

afterEach(async () => {
  await app.close();
});

describe("apps/api HTTP surface", () => {
  it("POST /projects creates a project", async () => {
    const res = await request(app.getHttpServer())
      .post("/projects")
      .send({ name: "My App" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "p1", name: "My App" });
  });

  it("POST /projects rejects an empty name with 400", async () => {
    const res = await request(app.getHttpServer())
      .post("/projects")
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("GET /projects lists projects", async () => {
    const res = await request(app.getHttpServer()).get("/projects");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "p1", name: "My App" }]);
  });

  it("GET /projects/:id returns 404 for an unknown project", async () => {
    const res = await request(app.getHttpServer()).get("/projects/missing");

    expect(res.status).toBe(404);
  });

  it("POST /projects/:id/blueprint persists a valid blueprint", async () => {
    const res = await request(app.getHttpServer())
      .post("/projects/p1/blueprint")
      .send(validBlueprint);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ projectId: "p1", data: validBlueprint });
  });

  it("POST /projects/:id/blueprint returns 404 for an unknown project", async () => {
    const res = await request(app.getHttpServer())
      .post("/projects/missing/blueprint")
      .send(validBlueprint);

    expect(res.status).toBe(404);
  });

  it("POST /projects/:id/blueprint rejects an invalid blueprint with 400", async () => {
    const res = await request(app.getHttpServer())
      .post("/projects/p1/blueprint")
      .send({ ...validBlueprint, architecture: { style: "spaghetti" } });

    expect(res.status).toBe(400);
  });

  it("GET /projects/:id/blueprint returns the current blueprint", async () => {
    const res = await request(app.getHttpServer()).get(
      "/projects/p1/blueprint",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ projectId: "p1", data: validBlueprint });
  });

  it("POST /projects/:id/generate runs the pipeline and returns the resulting artifacts", async () => {
    const res = await request(app.getHttpServer())
      .post("/projects/p1/generate")
      .send({ agentId: "claude" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual([
      { id: "a1", projectId: "p1", path: "PROJECT.md", content: "..." },
    ]);
  });

  it("POST /projects/:id/generate rejects an unsupported agentId with 400", async () => {
    const res = await request(app.getHttpServer())
      .post("/projects/p1/generate")
      .send({ agentId: "copilot" });

    expect(res.status).toBe(400);
  });

  it("POST /projects/:id/generate returns 404 for an unknown project", async () => {
    const res = await request(app.getHttpServer())
      .post("/projects/missing/generate")
      .send({ agentId: "claude" });

    expect(res.status).toBe(404);
  });

  it("GET /projects/:id/generated-files lists the project's generated artifacts", async () => {
    const res = await request(app.getHttpServer()).get(
      "/projects/p1/generated-files",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "a1", projectId: "p1", path: "PROJECT.md", content: "..." },
    ]);
  });

  it("GET /projects/:id/generated-files returns 404 for an unknown project", async () => {
    const res = await request(app.getHttpServer()).get(
      "/projects/missing/generated-files",
    );

    expect(res.status).toBe(404);
  });
});
