import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma";

/**
 * Prisma 7 requires a driver adapter for a direct database connection (the
 * schema's `datasource.url` field is gone — see prisma/schema.prisma and
 * apps/api/prisma.config.ts). DATABASE_URL is read directly from the
 * environment, matching the CLI's existing plain-process.env convention.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
