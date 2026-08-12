import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { safeParseBlueprint } from "@ai-zoll/blueprint";
import { getAgentAdapter, type SupportedAgentId } from "@ai-zoll/agents";
import { assertNoDuplicatePaths, generateWorkspace } from "@ai-zoll/generators";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";
import { BlueprintsService } from "../blueprints/blueprints.service";

/**
 * Runs the same canonical-generator + AgentAdapter pipeline
 * `apps/cli`'s `runInit` uses locally, against a project's already-stored
 * (and already-validated on write) Blueprint. Re-validates on read anyway —
 * Rule 9 applies to any value flowing into `generateWorkspace`, not just
 * fresh LLM output.
 */
@Injectable()
export class GenerateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly blueprints: BlueprintsService,
  ) {}

  async generate(projectId: string, agentId: SupportedAgentId) {
    await this.projects.findOne(projectId);
    const record = await this.blueprints.findCurrent(projectId);

    const parsed = safeParseBlueprint(record.data);
    if (!parsed.success) {
      throw new InternalServerErrorException(
        `Stored blueprint for project "${projectId}" failed re-validation`,
      );
    }
    const blueprint = parsed.data;

    const adapter = getAgentAdapter(agentId);
    const validation = adapter.validate(blueprint);
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Blueprint is not valid for agent "${agentId}"`,
        issues: validation.issues,
      });
    }

    const files = [
      ...generateWorkspace(blueprint),
      ...adapter.generateInstructions(blueprint),
      ...adapter.generateSkills(blueprint),
      ...adapter.generateRules(blueprint),
    ];
    assertNoDuplicatePaths(files);

    await this.prisma.agent.upsert({
      where: { projectId },
      create: { projectId, primary: agentId },
      update: { primary: agentId },
    });
    // Regenerating replaces the previous output — GeneratedArtifact isn't
    // versioned like BlueprintVersion, there's no product need to keep old
    // generated files around once a project regenerates.
    await this.prisma.generatedArtifact.deleteMany({ where: { projectId } });
    if (files.length > 0) {
      await this.prisma.generatedArtifact.createMany({
        data: files.map((file) => ({
          projectId,
          path: file.path,
          content: file.content,
        })),
      });
    }

    return this.prisma.generatedArtifact.findMany({
      where: { projectId },
      orderBy: { path: "asc" },
    });
  }

  async listGeneratedFiles(projectId: string) {
    await this.projects.findOne(projectId);
    return this.prisma.generatedArtifact.findMany({
      where: { projectId },
      orderBy: { path: "asc" },
    });
  }
}
