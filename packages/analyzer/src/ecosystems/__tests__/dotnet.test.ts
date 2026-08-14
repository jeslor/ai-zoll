import * as fs from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { makeFixtureRepo } from "../../__fixtures__/make-fixture-repo";
import { readDotnetDependencyNames } from "../dotnet";

let tempDirs: string[] = [];
beforeEach(() => {
  tempDirs = [];
});
afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
function seed(files: Record<string, string>): string {
  const dir = makeFixtureRepo(files);
  tempDirs.push(dir);
  return dir;
}

describe("readDotnetDependencyNames", () => {
  it("extracts PackageReference Include values and the SDK attribute as a pseudo-dependency", () => {
    const dir = seed({
      "MyApi.csproj": `<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
    <PackageReference Include="Swashbuckle.AspNetCore" />
  </ItemGroup>
</Project>`,
    });

    const names = readDotnetDependencyNames(dir);

    expect(names).toEqual(
      new Set(["Npgsql.EntityFrameworkCore.PostgreSQL", "Swashbuckle.AspNetCore", "Microsoft.NET.Sdk.Web"]),
    );
  });

  it("finds a .csproj file regardless of its project-specific name", () => {
    const dir = seed({
      "SomeRandomName.csproj": '<Project Sdk="Microsoft.NET.Sdk"></Project>',
    });

    const names = readDotnetDependencyNames(dir);

    expect(names).toEqual(new Set(["Microsoft.NET.Sdk"]));
  });

  it("returns an empty set when no .csproj exists anywhere", () => {
    const dir = seed({ "README.md": "# hi" });
    expect(readDotnetDependencyNames(dir)).toEqual(new Set());
  });

  it("finds .csproj files in subdirectories (real .NET solutions never put them at the repo root)", () => {
    const dir = seed({
      "Everything.sln": "",
      "src/Web/Web.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup><PackageReference Include="Swashbuckle.AspNetCore" /></ItemGroup></Project>',
      "src/Infrastructure/Infrastructure.csproj":
        '<Project Sdk="Microsoft.NET.Sdk"><ItemGroup><PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" /></ItemGroup></Project>',
      "tests/UnitTests/UnitTests.csproj": '<Project Sdk="Microsoft.NET.Sdk"><ItemGroup><PackageReference Include="xunit" /></ItemGroup></Project>',
    });

    const names = readDotnetDependencyNames(dir);

    expect(names).toEqual(
      new Set([
        "Microsoft.NET.Sdk.Web",
        "Swashbuckle.AspNetCore",
        "Microsoft.NET.Sdk",
        "Npgsql.EntityFrameworkCore.PostgreSQL",
        "xunit",
      ]),
    );
  });

  it("skips bin/obj build-output directories", () => {
    const dir = seed({
      "src/Web/Web.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>',
      "src/Web/bin/Debug/net8.0/Web.csproj": '<Project Sdk="Microsoft.NET.Sdk.SHOULD-NOT-BE-READ"></Project>',
      "src/Web/obj/Web.csproj": '<Project Sdk="Microsoft.NET.Sdk.ALSO-SHOULD-NOT-BE-READ"></Project>',
    });

    const names = readDotnetDependencyNames(dir);

    expect(names).toEqual(new Set(["Microsoft.NET.Sdk.Web"]));
  });
});
