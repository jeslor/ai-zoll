import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { BlueprintsController } from "./blueprints.controller";
import { BlueprintsService } from "./blueprints.service";

@Module({
  imports: [ProjectsModule],
  controllers: [BlueprintsController],
  providers: [BlueprintsService],
  exports: [BlueprintsService],
})
export class BlueprintsModule {}
