import type { z } from "zod";
import type {
  ProjectSchema,
  ProjectTypeSchema,
} from "../schemas/project.schema";
import type {
  ArchitectureSchema,
  ArchitectureStyleSchema,
} from "../schemas/architecture.schema";
import type { StackSchema } from "../schemas/stack.schema";
import type { FeatureSchema } from "../schemas/feature.schema";
import type { TestingSchema } from "../schemas/testing.schema";
import type { SecuritySchema } from "../schemas/security.schema";
import type { AgentSchema, AgentIdSchema } from "../schemas/agent.schema";
import type { ProjectBlueprintSchema } from "../schemas/blueprint.schema";

export type ProjectType = z.infer<typeof ProjectTypeSchema>;
export type Project = z.infer<typeof ProjectSchema>;

export type ArchitectureStyle = z.infer<typeof ArchitectureStyleSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;

export type Stack = z.infer<typeof StackSchema>;

export type Feature = z.infer<typeof FeatureSchema>;

export type Testing = z.infer<typeof TestingSchema>;

export type Security = z.infer<typeof SecuritySchema>;

export type AgentId = z.infer<typeof AgentIdSchema>;
export type Agent = z.infer<typeof AgentSchema>;

export type ProjectBlueprint = z.infer<typeof ProjectBlueprintSchema>;
