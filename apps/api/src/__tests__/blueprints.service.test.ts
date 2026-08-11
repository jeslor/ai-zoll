import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
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
  count?: ReturnType<typeof vi.fn>;
  versionCreate?: ReturnType<typeof vi.fn>;
  upsert?: ReturnType<typeof vi.fn>;
  findUnique?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    blueprintVersion: {
      count: overrides.count ?? vi.fn().mockResolvedValue(0),
      create: overrides.versionCreate ?? vi.fn().mockResolvedValue({}),
    },
    projectBlueprint: {
      upsert: overrides.upsert ?? vi.fn().mockResolvedValue({}),
      findUnique: overrides.findUnique ?? vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaService;
}

function fakeProjectsService(exists = true): ProjectsService {
  const findOne = exists
    ? vi.fn().mockResolvedValue({ id: "p1", name: "Project" })
    : vi.fn().mockRejectedValue(new NotFoundException());
  return { findOne } as unknown as ProjectsService;
}

describe("BlueprintsService.create", () => {
  it("persists a valid blueprint: creates a version and upserts the current pointer", async () => {
    const count = vi.fn().mockResolvedValue(2);
    const versionCreate = vi.fn().mockResolvedValue({});
    const upsert = vi.fn().mockResolvedValue({ projectId: "p1", data: validBlueprint });
    const service = new BlueprintsService(
      fakePrisma({ count, versionCreate, upsert }),
      fakeProjectsService(),
    );

    const result = await service.create("p1", validBlueprint);

    expect(versionCreate).toHaveBeenCalledWith({
      data: { projectId: "p1", versionNumber: 3, data: validBlueprint },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { projectId: "p1" },
      create: { projectId: "p1", data: validBlueprint },
      update: { data: validBlueprint },
    });
    expect(result).toEqual({ projectId: "p1", data: validBlueprint });
  });

  it("throws NotFoundException when the project doesn't exist, without touching blueprint tables", async () => {
    const versionCreate = vi.fn();
    const service = new BlueprintsService(
      fakePrisma({ versionCreate }),
      fakeProjectsService(false),
    );

    await expect(service.create("missing", validBlueprint)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(versionCreate).not.toHaveBeenCalled();
  });

  it("throws BadRequestException with issues for a structurally invalid blueprint", async () => {
    const versionCreate = vi.fn();
    const service = new BlueprintsService(
      fakePrisma({ versionCreate }),
      fakeProjectsService(),
    );
    const invalid = { ...validBlueprint, architecture: { style: "spaghetti" } };

    let caught: unknown;
    try {
      await service.create("p1", invalid);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    expect(versionCreate).not.toHaveBeenCalled();
  });
});

describe("BlueprintsService.findCurrent", () => {
  it("returns the current blueprint when one exists", async () => {
    const current = { projectId: "p1", data: validBlueprint };
    const findUnique = vi.fn().mockResolvedValue(current);
    const service = new BlueprintsService(
      fakePrisma({ findUnique }),
      fakeProjectsService(),
    );

    expect(await service.findCurrent("p1")).toEqual(current);
  });

  it("throws NotFoundException when no blueprint has been written yet", async () => {
    const service = new BlueprintsService(fakePrisma(), fakeProjectsService());

    await expect(service.findCurrent("p1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws NotFoundException when the project itself doesn't exist", async () => {
    const service = new BlueprintsService(fakePrisma(), fakeProjectsService(false));

    await expect(service.findCurrent("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
