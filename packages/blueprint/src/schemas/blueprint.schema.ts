import { z } from "zod";
import { ProjectSchema } from "./project.schema";
import { ArchitectureSchema } from "./architecture.schema";
import { StackSchema } from "./stack.schema";
import { FeaturesSchema } from "./feature.schema";
import { TestingSchema } from "./testing.schema";
import { SecuritySchema } from "./security.schema";
import { AgentSchema } from "./agent.schema";

/**
 * Current Blueprint schema version. A Blueprint claiming a different version
 * fails validation against *this* schema — migrating older Blueprints
 * forward is `sync` (spec §9/§26), not something this package does.
 */
export const CURRENT_BLUEPRINT_VERSION = "1.0" as const;

export const ProjectBlueprintSchema = z.object({
  version: z.literal(CURRENT_BLUEPRINT_VERSION),
  project: ProjectSchema,
  architecture: ArchitectureSchema,
  stack: StackSchema,
  features: FeaturesSchema,
  testing: TestingSchema,
  security: SecuritySchema,
  agent: AgentSchema,
});
