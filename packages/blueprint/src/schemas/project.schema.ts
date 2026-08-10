import { z } from "zod";

/**
 * Fixed set per spec §6 step 2 — presented as a closed list of options in the
 * new-project UI flow.
 */
export const ProjectTypeSchema = z.enum([
  "saas",
  "web-application",
  "api",
  "mobile-backend",
  "ecommerce",
  "internal-tool",
  "ai-application",
  "cli",
  "other",
]);

export const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: ProjectTypeSchema,
});
