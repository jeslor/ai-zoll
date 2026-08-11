import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { BlueprintsModule } from "./blueprints/blueprints.module";

@Module({
  imports: [PrismaModule, ProjectsModule, BlueprintsModule],
})
export class AppModule {}
