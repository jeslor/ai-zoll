import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { BlueprintsModule } from "./blueprints/blueprints.module";
import { GenerateModule } from "./generate/generate.module";

@Module({
  imports: [PrismaModule, ProjectsModule, BlueprintsModule, GenerateModule],
})
export class AppModule {}
