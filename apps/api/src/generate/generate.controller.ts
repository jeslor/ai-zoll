import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { GenerateSchema, type GenerateDto } from "./dto/generate.schema";
import { GenerateService } from "./generate.service";

@Controller("projects/:projectId")
export class GenerateController {
  constructor(private readonly generate: GenerateService) {}

  @Post("generate")
  create(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(GenerateSchema)) body: GenerateDto,
  ) {
    return this.generate.generate(projectId, body.agentId);
  }

  @Get("generated-files")
  findAll(@Param("projectId") projectId: string) {
    return this.generate.listGeneratedFiles(projectId);
  }
}
