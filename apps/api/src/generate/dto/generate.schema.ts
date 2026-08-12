import { z } from "zod";
import { SUPPORTED_AGENT_IDS } from "@ai-zoll/agents";

export const GenerateSchema = z.object({
  agentId: z.enum(SUPPORTED_AGENT_IDS),
});

export type GenerateDto = z.infer<typeof GenerateSchema>;
