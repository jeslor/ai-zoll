import * as fs from "node:fs";
import * as path from "node:path";
import { confirm } from "@inquirer/prompts";
import type { AIProvider, BlueprintInput, RepositoryInsights } from "@ai-zoll/ai";
import type { Finding, RepositoryAnalysis } from "@ai-zoll/analyzer";
import { analyzeRepository } from "@ai-zoll/analyzer";
import { runAnalyze } from "../run-analyze";
import { selectAIProvider } from "../select-ai-provider";
import { printApplyResult } from "../print-apply-result";
import { generateConventionsMd } from "../generate-conventions-md";
import type { TestingTypes } from "./prompts";
import {
  promptAgent,
  promptArchitectureStyle,
  promptAuthentication,
  promptAuthorization,
  promptBackend,
  promptDatabase,
  promptFrontend,
  promptOrm,
  promptProjectDescription,
  promptProjectName,
  promptProjectType,
  promptTestingTypes,
} from "./prompts";

export interface RunAnalyzeCommandOptions {
  useAI: boolean;
}

function printFinding(label: string, finding: Finding<unknown>): void {
  if (finding.confidence === "detected") {
    console.log(`  ✓ ${label}: ${finding.value} (detected — ${finding.reason})`);
  } else if (finding.confidence === "likely") {
    console.log(`  ~ ${label}: ${finding.value} (likely — ${finding.reason})`);
  } else {
    console.log(`  ? ${label}: unknown`);
  }
}

/**
 * detected -> use directly. likely -> confirm-or-decline; declining falls
 * through to a fresh prompt (not pre-filled with the declined value, so
 * it's unambiguous the suggestion was rejected). unknown -> prompt directly.
 */
async function resolveField<T>(
  label: string,
  finding: Finding<T>,
  promptFn: (defaultValue?: T) => Promise<T>,
): Promise<T> {
  if (finding.confidence === "detected") {
    return finding.value as T;
  }
  if (finding.confidence === "likely") {
    const accept = await confirm({
      message: `${label}: detected "${String(finding.value)}" (${finding.reason}) — use this?`,
      default: true,
    });
    if (accept) {
      return finding.value as T;
    }
  }
  return promptFn();
}

async function resolveBooleanField(label: string, finding: Finding<boolean>): Promise<boolean> {
  if (finding.confidence === "detected") {
    return finding.value as boolean;
  }
  if (finding.confidence === "likely") {
    return confirm({ message: `${label}: ${finding.reason} — is this right?`, default: true });
  }
  return confirm({ message: `${label}?`, default: false });
}

async function resolveTesting(testing: {
  unit: Finding<boolean>;
  integration: Finding<boolean>;
  e2e: Finding<boolean>;
}): Promise<TestingTypes> {
  const allUnknown =
    testing.unit.confidence === "unknown" &&
    testing.integration.confidence === "unknown" &&
    testing.e2e.confidence === "unknown";

  if (allUnknown) {
    return promptTestingTypes();
  }

  return {
    unit: await resolveBooleanField("Unit testing", testing.unit),
    integration: await resolveBooleanField("Integration testing", testing.integration),
    e2e: await resolveBooleanField("E2E testing", testing.e2e),
  };
}

const INSIGHTS_SECTIONS: Array<[label: string, key: keyof RepositoryInsights]> = [
  ["Business domains", "businessDomains"],
  ["Modules", "modules"],
  ["Architectural patterns", "architecturalPatterns"],
  ["Conventions", "conventions"],
  ["Important dependencies", "importantDependencies"],
  ["Testing patterns", "testingPatterns"],
  ["Security patterns", "securityPatterns"],
  ["Undocumented conventions", "undocumentedConventions"],
  ["Inconsistencies", "inconsistencies"],
  ["Missing documentation", "missingDocumentation"],
];

/**
 * spec §17's "Existing Project Report", AI-assisted half (§16). Purely
 * informational — never blocks or feeds the interactive resolution below;
 * a request-level failure (network, malformed structured output) degrades
 * to a one-line notice rather than failing the whole `analyze` command,
 * since this is explicitly optional per "AI improves output, never
 * required". A missing-API-key configuration error is deliberately NOT
 * caught here — see the eager `selectAIProvider` call in
 * `runAnalyzeCommand`, which fails fast before any of this report prints.
 *
 * Returns the fetched insights (or null on failure) so the caller can reuse
 * them for CONVENTIONS.md (`generate-conventions-md.ts`) without a second,
 * redundant AI call.
 */
async function fetchAndPrintAIInsights(
  provider: AIProvider,
  analysis: RepositoryAnalysis,
): Promise<RepositoryInsights | null> {
  console.log("AI-ASSISTED INSIGHTS\n");

  let insights: RepositoryInsights;
  try {
    insights = await provider.interpretRepository(analysis);
  } catch (error) {
    console.log(`  Unavailable: ${error instanceof Error ? error.message : String(error)}`);
    console.log();
    return null;
  }

  const nonEmptySections = INSIGHTS_SECTIONS.filter(([, key]) => insights[key].length > 0);
  if (nonEmptySections.length === 0) {
    console.log("  No additional insights identified.");
    console.log();
    return insights;
  }

  for (const [label, key] of nonEmptySections) {
    console.log(`  ${label}:`);
    for (const item of insights[key]) {
      console.log(`    - ${item}`);
    }
  }
  console.log();
  return insights;
}

/**
 * The existing-project flow (spec §12-18): analyze first, show what was
 * found, confirm before writing anything. Reuses runAnalyze's merge-aware
 * writer, so hand-written files this repo already has are never clobbered.
 */
export async function runAnalyzeCommand(options: RunAnalyzeCommandOptions): Promise<void> {
  const projectDir = process.cwd();

  if (fs.existsSync(path.join(projectDir, ".ai-zoll", "state.json"))) {
    throw new Error(`"${projectDir}" is already an ai-zoll project — use "ai-zoll sync" instead.`);
  }

  // Selected eagerly, before any output, so a missing ANTHROPIC_API_KEY
  // fails fast — the same "--ai with no key throws, never silently
  // degrades" contract selectAIProvider already enforces elsewhere, just
  // surfaced before the interactive Q&A below rather than after it.
  const aiProvider = options.useAI ? selectAIProvider(true) : null;

  console.log("Analyzing repository...\n");
  const analysis = analyzeRepository(projectDir);

  console.log("PROJECT ANALYSIS\n");
  printFinding("Frontend", analysis.framework.frontend);
  printFinding("Backend", analysis.framework.backend);
  printFinding("Database", analysis.database.database);
  printFinding("ORM", analysis.database.orm);
  printFinding("Unit testing", analysis.testing.unit);
  printFinding("Integration testing", analysis.testing.integration);
  printFinding("E2E testing", analysis.testing.e2e);
  printFinding("Authentication", analysis.dependency.authentication);
  printFinding("Authorization", analysis.dependency.authorization);
  console.log();

  const insights = aiProvider ? await fetchAndPrintAIInsights(aiProvider, analysis) : null;
  const conventionsMdContent = insights ? generateConventionsMd(insights) : null;

  // project.name: prefer PackageAnalyzer's finding, fall back to GitAnalyzer's.
  const nameFinding: Finding<string> =
    analysis.package.name.confidence !== "unknown" ? analysis.package.name : analysis.git.projectName;
  const name = await resolveField("Project name", nameFinding, promptProjectName);
  const description = await resolveField(
    "Description",
    analysis.package.description,
    promptProjectDescription,
  );

  // No analyzer produces project.type — always prompt.
  const type = await promptProjectType();

  // architecture.style is deliberately never resolved from analysis
  // (docs/decisions/0004-deterministic-vs-ai-boundary.md — classifying a
  // style from directory names is "architecture reasoning", not detection).
  // directory.signals is shown as an informational hint only, never a default.
  if (analysis.directory.signals.confidence === "detected" && analysis.directory.signals.value) {
    console.log(
      `  (noticed these directories, which may be relevant: ${analysis.directory.signals.value.join(", ")})`,
    );
  }
  const architectureStyle = await promptArchitectureStyle();

  const frontend = await resolveField("Frontend", analysis.framework.frontend, promptFrontend);
  const backend = await resolveField("Backend", analysis.framework.backend, promptBackend);
  const database = await resolveField("Database", analysis.database.database, promptDatabase);
  const orm = await resolveField("ORM", analysis.database.orm, promptOrm);

  const testing = await resolveTesting(analysis.testing);

  const authentication = await resolveField(
    "Authentication",
    analysis.dependency.authentication,
    promptAuthentication,
  );
  const authorization = await resolveField(
    "Authorization",
    analysis.dependency.authorization,
    promptAuthorization,
  );

  const agentId = await promptAgent();

  const input: BlueprintInput = {
    project: { name, description, type },
    architecture: { style: architectureStyle },
    stack: { frontend, backend, database, orm },
    features: [],
    testing,
    security: { authentication, authorization },
    agent: { primary: agentId },
  };

  const result = await runAnalyze({
    projectDir,
    input,
    agentId,
    useAI: options.useAI,
    conventionsMdContent,
  });

  console.log(`\nAdopted "${projectDir}" for agent "${result.agentId}":`);
  printApplyResult(result);
}
