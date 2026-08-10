export {
  ProjectBlueprintSchema,
  CURRENT_BLUEPRINT_VERSION,
} from "./schemas/blueprint.schema";
export { ProjectSchema, ProjectTypeSchema } from "./schemas/project.schema";
export {
  ArchitectureSchema,
  ArchitectureStyleSchema,
} from "./schemas/architecture.schema";
export { StackSchema } from "./schemas/stack.schema";
export { FeatureSchema, FeaturesSchema } from "./schemas/feature.schema";
export { TestingSchema } from "./schemas/testing.schema";
export { SecuritySchema } from "./schemas/security.schema";
export { AgentSchema, AgentIdSchema } from "./schemas/agent.schema";

export type {
  ProjectBlueprint,
  Project,
  ProjectType,
  Architecture,
  ArchitectureStyle,
  Stack,
  Feature,
  Testing,
  Security,
  Agent,
  AgentId,
} from "./types";

export {
  safeParseBlueprint,
  parseBlueprint,
} from "./validation/validate-blueprint";
export type { BlueprintValidationResult } from "./validation/validate-blueprint";
export {
  BlueprintValidationError,
} from "./validation/errors";
export type { BlueprintValidationIssue } from "./validation/errors";
