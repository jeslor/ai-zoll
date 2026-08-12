import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { BlueprintsModule } from "../blueprints/blueprints.module";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";

@Module({
  imports: [ProjectsModule, BlueprintsModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
