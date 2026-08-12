import { describe, expect, it, vi } from "vitest";
import { InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { GenerateService } from "../generate/generate.service";
import { BlueprintsService } from "../blueprints/blueprints.service";
import { ProjectsService } from "../projects/projects.service";
import type { PrismaService } from "../prisma/prisma.service";

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

function fakePrisma(overrides: {
  agentUpsert?: ReturnType<typeof vi.fn>;
  deleteMany?: ReturnType<typeof vi.fn>;
  createMany?: ReturnType<typeof vi.fn>;
  findMany?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    agent: {
      upsert: overrides.agentUpsert ?? vi.fn().mockResolvedValue({}),
    },
    generatedArtifact: {
      deleteMany: overrides.deleteMany ?? vi.fn().mockResolvedValue({}),
      createMany: overrides.createMany ?? vi.fn().mockResolvedValue({}),
      findMany: overrides.findMany ?? vi.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
}

function fakeProjectsService(exists = true): ProjectsService {
  const findOne = exists
    ? vi.fn().mockResolvedValue({ id: "p1", name: "Project" })
    : vi.fn().mockRejectedValue(new NotFoundException());
  return { findOne } as unknown as ProjectsService;
}

function fakeBlueprintsService(data: unknown = validBlueprint): BlueprintsService {
  const findCurrent = data
    ? vi.fn().mockResolvedValue({ projectId: "p1", data })
    : vi.fn().mockRejectedValue(new NotFoundException());
  return { findCurrent } as unknown as BlueprintsService;
}

describe("GenerateService.generate", () => {
  it("generates files for a valid blueprint and persists them as artifacts", async () => {
    const agentUpsert = vi.fn().mockResolvedValue({});
    const deleteMany = vi.fn().mockResolvedValue({});
    const createMany = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      { id: "a1", projectId: "p1", path: "PROJECT.md", content: "..." },
    ]);
    const service = new GenerateService(
      fakePrisma({ agentUpsert, deleteMany, createMany, findMany }),
      fakeProjectsService(),
      fakeBlueprintsService(),
    );

    const result = await service.generate("p1", "claude");

    expect(agentUpsert).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      create: { projectId: "p1", primary: "claude" },
      update: { primary: "claude" },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { projectId: "p1" } });
    expect(createMany).toHaveBeenCalledTimes(1);
    const createdFiles = createMany.mock.calls[0][0].data as Array<{ path: string }>;
    expect(createdFiles.length).toBeGreaterThan(0);
    expect(createdFiles.some((file) => file.path === "PROJECT.md")).toBe(true);
    expect(createdFiles.some((file) => file.path === "CLAUDE.md")).toBe(true);
    expect(result).toEqual([
      { id: "a1", projectId: "p1", path: "PROJECT.md", content: "..." },
    ]);
  });

  it("throws NotFoundException when the project doesn't exist", async () => {
    const service = new GenerateService(
      fakePrisma(),
      fakeProjectsService(false),
      fakeBlueprintsService(),
    );

    await expect(service.generate("missing", "claude")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws NotFoundException when the project has no blueprint yet", async () => {
    const service = new GenerateService(
      fakePrisma(),
      fakeProjectsService(),
      fakeBlueprintsService(null),
    );

    await expect(service.generate("p1", "claude")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws InternalServerErrorException when the stored blueprint fails re-validation", async () => {
    const service = new GenerateService(
      fakePrisma(),
      fakeProjectsService(),
      fakeBlueprintsService({ ...validBlueprint, architecture: { style: "spaghetti" } }),
    );

    await expect(service.generate("p1", "claude")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it("generates for a second agent (cursor), confirming agent selection changes the adapter used", async () => {
    const createMany = vi.fn().mockResolvedValue({});
    const service = new GenerateService(
      fakePrisma({ createMany }),
      fakeProjectsService(),
      fakeBlueprintsService(),
    );

    await service.generate("p1", "cursor");

    const createdFiles = createMany.mock.calls[0][0].data as Array<{ path: string }>;
    expect(createdFiles.some((file) => file.path === ".cursor/rules/project.mdc")).toBe(
      true,
    );
    expect(createdFiles.some((file) => file.path === "CLAUDE.md")).toBe(false);
  });
});

describe("GenerateService.listGeneratedFiles", () => {
  it("returns artifacts for a project ordered by path", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "a1", projectId: "p1", path: "PROJECT.md", content: "..." },
    ]);
    const service = new GenerateService(
      fakePrisma({ findMany }),
      fakeProjectsService(),
      fakeBlueprintsService(),
    );

    const result = await service.listGeneratedFiles("p1");

    expect(findMany).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      orderBy: { path: "asc" },
    });
    expect(result).toHaveLength(1);
  });

  it("throws NotFoundException when the project doesn't exist", async () => {
    const service = new GenerateService(
      fakePrisma(),
      fakeProjectsService(false),
      fakeBlueprintsService(),
    );

    await expect(service.listGeneratedFiles("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
