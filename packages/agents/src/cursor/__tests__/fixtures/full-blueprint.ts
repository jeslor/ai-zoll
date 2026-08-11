import type { ProjectBlueprint } from "@ai-zoll/blueprint";

/** Mirrors the spec §4 example verbatim. */
export const fullBlueprint: ProjectBlueprint = {
  version: "1.0",
  project: {
    name: "School Management Platform",
    description:
      "A platform for schools to manage students, teachers and payments.",
    type: "saas",
  },
  architecture: { style: "modular" },
  stack: {
    frontend: "nextjs",
    backend: "nestjs",
    database: "postgresql",
    orm: "prisma",
  },
  features: [
    { name: "Students", description: "Manage student records" },
    { name: "Payments", description: "Manage school payments" },
  ],
  testing: { unit: true, integration: true, e2e: true },
  security: { authentication: "jwt", authorization: "rbac" },
  agent: { primary: "cursor" },
};
