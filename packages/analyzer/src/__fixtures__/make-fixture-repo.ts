import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Creates a small temp-directory "repo" from a flat map of relative paths to
 * file contents — e.g. `{ "package.json": "...", "prisma/schema.prisma": "..." }`.
 * Caller is responsible for cleanup (fs.rmSync(dir, { recursive: true, force: true })),
 * matching apps/cli's existing temp-dir test pattern.
 */
export function makeFixtureRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zoll-analyzer-fixture-"));
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return dir;
}
