#!/usr/bin/env node
import { runInitCommand } from "./commands/init";
import { runSyncCommand } from "./commands/sync";
import { runAnalyzeCommand } from "./commands/analyze";
import { runCheckCommand } from "./commands/check";

async function main(): Promise<void> {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (command === "init") {
    await runInitCommand({ useAI: args.includes("--ai") });
    return;
  }

  if (command === "sync") {
    await runSyncCommand(args[0]);
    return;
  }

  if (command === "analyze") {
    await runAnalyzeCommand({ useAI: args.includes("--ai") });
    return;
  }

  if (command === "check") {
    runCheckCommand();
    return;
  }

  console.log(
    "Usage: ai-zoll init [--ai]\n       ai-zoll sync [agent]\n       ai-zoll analyze [--ai]\n       ai-zoll check",
  );
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
