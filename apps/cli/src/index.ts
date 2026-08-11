#!/usr/bin/env node
import { runInitCommand } from "./commands/init";

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command === "init") {
    await runInitCommand();
    return;
  }

  console.log("Usage: ai-zoll init");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
