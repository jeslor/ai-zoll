import { runCheck } from "../run-check";
import type { DriftEntry } from "../run-check";

function printDriftEntry(entry: DriftEntry): void {
  const marker = entry.confidence === "detected" ? "⚠" : "?";
  const verb = entry.confidence === "detected" ? "found" : "appears to show";
  console.log(
    `${marker} ${entry.label}: Blueprint says "${entry.expected}", repository ${verb} "${entry.actual}".`,
  );
}

/**
 * Thin, non-interactive wrapper — same shape as `sync`. Exits with a
 * non-zero code when drift is found, so `ai-zoll check` is usable as a CI
 * gate, not just a human-facing report.
 */
export function runCheckCommand(): void {
  const { drift } = runCheck(process.cwd());

  if (drift.length === 0) {
    console.log("No drift detected — repository matches the stored Blueprint.");
    return;
  }

  console.log("Architecture Drift\n");
  for (const entry of drift) {
    printDriftEntry(entry);
  }
  console.log(`\n${drift.length} ${drift.length === 1 ? "item" : "items"} of drift found.`);
  process.exitCode = 1;
}
