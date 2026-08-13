#!/usr/bin/env node
import { runInitCommand } from "./commands/init";
import { runSyncCommand } from "./commands/sync";

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

  console.log("Usage: ai-zoll init [--ai]\n       ai-zoll sync [agent]");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
