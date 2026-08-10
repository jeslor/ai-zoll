import { z } from "zod";

export const FeatureSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const FeaturesSchema = z.array(FeatureSchema).default([]);
