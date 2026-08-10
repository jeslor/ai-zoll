import { z } from "zod";

/**
 * Open (non-empty string) fields, same rationale as stack.schema.ts — auth
 * mechanisms vary too widely to enumerate today without blocking legitimate
 * choices.
 */
export const SecuritySchema = z.object({
  authentication: z.string().min(1),
  authorization: z.string().min(1),
});
