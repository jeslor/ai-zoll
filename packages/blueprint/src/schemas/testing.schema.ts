import { z } from "zod";

export const TestingSchema = z.object({
  unit: z.boolean(),
  integration: z.boolean(),
  e2e: z.boolean(),
});
