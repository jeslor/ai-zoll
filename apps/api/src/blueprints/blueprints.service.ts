import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { safeParseBlueprint } from "@ai-zoll/blueprint";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";

/**
 * Persists a validated ProjectBlueprint per project. Reuses the canonical
 * safeParseBlueprint validator from @ai-zoll/blueprint directly
 * (Rule 9/ADR 0002) — the request body is re-validated server-side even
 * though a well-behaved caller (an AIProvider) already validated it locally.
 */
@Injectable()
export class BlueprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async create(projectId: string, body: unknown) {
    await this.projects.findOne(projectId);

    const result = safeParseBlueprint(body);
    if (!result.success) {
      throw new BadRequestException({
        message: "Invalid ProjectBlueprint",
        issues: result.issues,
      });
    }
    const blueprint = result.data;

    const existingCount = await this.prisma.blueprintVersion.count({
      where: { projectId },
    });

    await this.prisma.blueprintVersion.create({
      data: {
        projectId,
        versionNumber: existingCount + 1,
        data: blueprint,
      },
    });

    return this.prisma.projectBlueprint.upsert({
      where: { projectId },
      create: { projectId, data: blueprint },
      update: { data: blueprint },
    });
  }

  async findCurrent(projectId: string) {
    await this.projects.findOne(projectId);

    const current = await this.prisma.projectBlueprint.findUnique({
      where: { projectId },
    });
    if (!current) {
      throw new NotFoundException(
        `Project "${projectId}" has no blueprint yet`,
      );
    }
    return current;
  }
}
