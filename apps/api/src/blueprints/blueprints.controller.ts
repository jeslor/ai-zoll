import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { BlueprintsService } from "./blueprints.service";

@Controller("projects/:projectId/blueprint")
export class BlueprintsController {
  constructor(private readonly blueprints: BlueprintsService) {}

  @Post()
  create(@Param("projectId") projectId: string, @Body() body: unknown) {
    return this.blueprints.create(projectId, body);
  }

  @Get()
  findCurrent(@Param("projectId") projectId: string) {
    return this.blueprints.findCurrent(projectId);
  }
}
