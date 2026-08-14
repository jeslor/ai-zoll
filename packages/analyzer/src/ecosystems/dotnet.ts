import * as fs from "node:fs";
import * as path from "node:path";
import { isExcludedPath } from "../exclusion";

/** Matches `<PackageReference Include="Name" .../>` regardless of `<ItemGroup>` nesting or attribute order (Version can come before or after Include, or be absent for a framework-implied reference). */
const PACKAGE_REFERENCE_PATTERN = /<PackageReference\s+[^>]*\bInclude="([^"]+)"/g;

/**
 * A real ASP.NET Core web project usually has no explicit `PackageReference`
 * for the framework itself — it's implied by the project's SDK attribute
 * (`<Project Sdk="Microsoft.NET.Sdk.Web">`), not a NuGet package. Injected
 * into the returned set as a pseudo-dependency (`framework-analyzer.ts`
 * maps it to "aspnet") so this is still detectable via the same
 * dependency-name matching every other signal table uses, rather than
 * inventing a whole second signal shape just for .NET.
 */
const SDK_ATTRIBUTE_PATTERN = /<Project\s+[^>]*\bSdk="([^"]+)"/;

const MAX_WALK_DEPTH = 4;
/** .NET build output — never contains a source .csproj, just wasteful to traverse in a real solution with many projects. */
const SKIP_DIR_NAMES = new Set(["bin", "obj"]);

function readCsprojFile(filePath: string, names: string[]): void {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return;
  }
  for (const match of content.matchAll(PACKAGE_REFERENCE_PATTERN)) {
    if (match[1]) {
      names.push(match[1]);
    }
  }
  const sdkMatch = SDK_ATTRIBUTE_PATTERN.exec(content);
  if (sdkMatch?.[1]) {
    names.push(sdkMatch[1]);
  }
}

/**
 * .NET has no single fixed manifest filename *or location* — the project
 * file is named after the project itself, and unlike every other ecosystem
 * this package reads, a real solution's `.csproj` files essentially always
 * live in subdirectories (`src/ProjectName/ProjectName.csproj`), not the
 * repo root. Originally repo-root-only; found dogfooding against 5 real,
 * unmodified .NET solutions that this reported *nothing at all* for under
 * that scope — every single one had its `.csproj` files exclusively in
 * `src/*`/`tests/*`. Bounded, exclusion-aware walk (same `MAX_WALK_DEPTH`
 * pattern `TestAnalyzer`/`DirectoryAnalyzer` already use), additionally
 * skipping `bin`/`obj` build-output directories, which never contain a
 * source `.csproj` and can be large in a real, built solution.
 */
export function readDotnetDependencyNames(repoPath: string): Set<string> {
  const names: string[] = [];

  function walk(dir: string, relativeDir: string, depth: number): void {
    if (depth > MAX_WALK_DEPTH) {
      return;
    }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryRelPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (isExcludedPath(entryRelPath)) {
        continue;
      }
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        walk(path.join(dir, entry.name), entryRelPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith(".csproj")) {
        readCsprojFile(path.join(dir, entry.name), names);
      }
    }
  }

  walk(repoPath, "", 0);
  return new Set(names);
}
