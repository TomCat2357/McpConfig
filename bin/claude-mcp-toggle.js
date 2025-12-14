#!/usr/bin/env node
import { run } from "../src/tui.js";

run(process.argv.slice(2)).catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
});
