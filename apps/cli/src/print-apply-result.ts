import type { ApplyResult } from "./apply-generated-files";

/** Shared by commands/sync.ts and commands/analyze.ts — same report shape either way. */
export function printApplyResult(result: ApplyResult): void {
  if (result.created.length > 0) {
    console.log(`  Created:`);
    for (const p of result.created) console.log(`    + ${p}`);
  }
  if (result.updated.length > 0) {
    console.log(`  Updated:`);
    for (const p of result.updated) console.log(`    ~ ${p}`);
  }
  if (result.deleted.length > 0) {
    console.log(`  Deleted:`);
    for (const p of result.deleted) console.log(`    - ${p}`);
  }
  if (result.preserved.length > 0) {
    console.log(`  Preserved (left untouched):`);
    for (const p of result.preserved) console.log(`    ! ${p.path} — ${p.reason}`);
  }
}
