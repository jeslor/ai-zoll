import { runCheck } from "../run-check";
import type { DriftEntry } from "../run-check";
import type { ImportBoundaryViolation } from "@ai-zoll/analyzer";

function printDriftEntry(entry: DriftEntry): void {
  const marker = entry.confidence === "detected" ? "⚠" : "?";
  const verb = entry.confidence === "detected" ? "found" : "appears to show";
  console.log(
    `${marker} ${entry.label}: Blueprint says "${entry.expected}", repository ${verb} "${entry.actual}".`,
  );
}

function printImportBoundaryViolation(violation: ImportBoundaryViolation): void {
  console.log(
    `⚠ ${violation.file} (${violation.fromLayer}) imports ${violation.importedFile} (${violation.toLayer}) — inner layers must not depend on outer layers.`,
  );
}

/**
 * Thin, non-interactive wrapper — same shape as `sync`. Exits with a
 * non-zero code when drift, newly-appeared directory conventions, or
 * import-boundary violations are found, so `ai-zoll check` is usable as a
 * CI gate, not just a human-facing report.
 */
export function runCheckCommand(): void {
  const { drift, newDirectoryConventions, importBoundaryViolations } = runCheck(process.cwd());
  const totalFindings = drift.length + newDirectoryConventions.length + importBoundaryViolations.length;

  if (totalFindings === 0) {
    console.log("No drift detected — repository matches the stored Blueprint.");
    return;
  }

  console.log("Architecture Drift\n");
  for (const entry of drift) {
    printDriftEntry(entry);
  }
  for (const violation of importBoundaryViolations) {
    printImportBoundaryViolation(violation);
  }
  if (newDirectoryConventions.length > 0) {
    console.log(
      `⚠ ${newDirectoryConventions.length} new directory convention${newDirectoryConventions.length === 1 ? "" : "s"} since the last check: ${newDirectoryConventions.join(", ")}.`,
    );
  }
  console.log(`\n${totalFindings} ${totalFindings === 1 ? "item" : "items"} of drift found.`);
  process.exitCode = 1;
}
