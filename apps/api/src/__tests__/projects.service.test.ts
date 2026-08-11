import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ProjectsService } from "../projects/projects.service";
import type { PrismaService } from "../prisma/prisma.service";

/** Minimal fake matching only the Prisma surface ProjectsService actually calls. */
function fakePrisma(overrides: Partial<PrismaService["project"]> = {}) {
  return {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      ...overrides,
    },
  } as unknown as PrismaService;
}

describe("ProjectsService", () => {
  it("create() passes name through to prisma.project.create", async () => {
    const create = vi.fn().mockResolvedValue({ id: "p1", name: "My App" });
    const service = new ProjectsService(fakePrisma({ create }));

    const result = await service.create({ name: "My App" });

    expect(create).toHaveBeenCalledWith({ data: { name: "My App" } });
    expect(result).toEqual({ id: "p1", name: "My App" });
  });

  it("findAll() returns whatever prisma.project.findMany returns", async () => {
    const projects = [{ id: "p1", name: "A" }, { id: "p2", name: "B" }];
    const findMany = vi.fn().mockResolvedValue(projects);
    const service = new ProjectsService(fakePrisma({ findMany }));

    expect(await service.findAll()).toEqual(projects);
  });

  it("findOne() returns the project when found", async () => {
    const project = { id: "p1", name: "A" };
    const findUnique = vi.fn().mockResolvedValue(project);
    const service = new ProjectsService(fakePrisma({ findUnique }));

    expect(await service.findOne("p1")).toEqual(project);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("findOne() throws NotFoundException when the project doesn't exist", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = new ProjectsService(fakePrisma({ findUnique }));

    await expect(service.findOne("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
