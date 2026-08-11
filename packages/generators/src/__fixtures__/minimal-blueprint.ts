import type { ProjectBlueprint } from "@ai-zoll/blueprint";

/** Bare-minimum blueprint: no features, everything else at its plainest. */
export const minimalBlueprint: ProjectBlueprint = {
  version: "1.0",
  project: {
    name: "Minimal Project",
    description: "The smallest valid blueprint.",
    type: "cli",
  },
  architecture: { style: "layered" },
  stack: {
    frontend: "none",
    backend: "none",
    database: "none",
    orm: "none",
  },
  features: [],
  testing: { unit: false, integration: false, e2e: false },
  security: { authentication: "none", authorization: "none" },
  agent: { primary: "claude" },
};
