import { z } from "zod";

/**
 * Deliberately open (non-empty string) rather than a closed enum. Spec §6:
 * "the system should be extensible... do not hardcode the UI architecture so
 * tightly that adding a new technology requires rewriting the application."
 * A closed enum here would force a schema change for every new framework a
 * user picks, which contradicts that. Known suggested values (nextjs, react,
 * vue, angular, none / nestjs, express, fastify, django, fastapi, none /
 * postgresql, mysql, mongodb, sqlite, redis, other / prisma, drizzle,
 * typeorm, sqlalchemy) live in UI-layer option lists, not in this schema.
 */
const StackChoiceSchema = z.string().min(1);

export const StackSchema = z.object({
  frontend: StackChoiceSchema,
  backend: StackChoiceSchema,
  database: StackChoiceSchema,
  orm: StackChoiceSchema,
});
