import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 CLI config (migrate/generate) — the running app itself does NOT
// read this file; PrismaService constructs its own driver adapter directly
// from process.env.DATABASE_URL (populated via `node --env-file=.env`).
export default defineConfig({
  schema: "../../prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
