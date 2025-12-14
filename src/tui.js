import { stdin, stdout } from "node:process";
import {
  listServers,
  toggleServer,
  enableServer,
  disableServer,
  getPaths
} from "./config.js";

const ansi = {
  clear: "\x1b[2J\x1b[H",
  inverseOn: "\x1b[7m",
  inverseOff: "\x1b[27m",
  dim: "\x1b[2m",
  reset: "\x1b[0m"
};

function isTTYInteractive() {
  return stdout.isTTY && stdin.isTTY && process.env.CI !== "true";
}

function render(title, items, selected) {
  stdout.write(ansi.clear);
  stdout.write(`\n  ${title}\n\n`);

  if (items.length === 0) {
    stdout.write("  No MCP servers found in ~/.claude.json and backup.\n\n");
    return;
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const prefix = i === selected ? "▶ " : "  ";
    const mark = it.enabled ? "✓" : "✗";
    const line = `${prefix}${mark} ${it.name}`;
    if (i === selected) {
      stdout.write(`  ${ansi.inverseOn}${line}${ansi.inverseOff}\n`);
    } else {
      stdout.write(`  ${line}\n`);
    }
  }

  stdout.write(
    `\n  ${ansi.dim}↑/↓: Navigate  SPACE: Toggle  Q: Quit${ansi.reset}\n`
  );
}

function usage() {
  const { CONFIG_PATH, BACKUP_PATH } = getPaths();
  stdout.write(`
Usage:
  claude-mcp-toggle                # interactive (TTY)
  claude-mcp-toggle list
  claude-mcp-toggle toggle <name>
  claude-mcp-toggle enable <name>
  claude-mcp-toggle disable <name>

Files:
  ${CONFIG_PATH}
  ${BACKUP_PATH}
`.trimStart());
}

async function runNonInteractive(args) {
  const [cmd, name] = args;

  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    usage();
    return;
  }

  if (cmd === "list") {
    const servers = await listServers();
    if (servers.length === 0) {
      stdout.write("No MCP servers.\n");
      return;
    }
    for (const s of servers) {
      stdout.write(`${s.enabled ? "ENABLED " : "DISABLED"} ${s.name}\n`);
    }
    return;
  }

  if (cmd === "toggle") {
    if (!name) throw new Error("Missing <name>");
    const r = await toggleServer(name);
    stdout.write(`Server '${name}' is now ${r.newState ? "ENABLED" : "DISABLED"}\n`);
    return;
  }

  if (cmd === "enable") {
    if (!name) throw new Error("Missing <name>");
    const r = await enableServer(name);
    stdout.write(`Server '${name}' is now ${r.newState ? "ENABLED" : "DISABLED"}\n`);
    return;
  }

  if (cmd === "disable") {
    if (!name) throw new Error("Missing <name>");
    const r = await disableServer(name);
    stdout.write(`Server '${name}' is now ${r.newState ? "ENABLED" : "DISABLED"}\n`);
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

async function runInteractive() {
  let selected = 0;

  const cleanup = () => {
    try {
      stdin.setRawMode(false);
    } catch {}
    stdin.pause();
    stdin.removeAllListeners("data");
  };

  const readAndRender = async () => {
    const servers = await listServers();
    selected = Math.max(0, Math.min(selected, Math.max(0, servers.length - 1)));
    render("Claude MCP Toggle", servers, selected);
    return servers;
  };

  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  let servers = await readAndRender();

  return new Promise((resolve, reject) => {
    stdin.on("data", async (key) => {
      try {
        const code = key.charCodeAt(0);

        // q / Q / Ctrl+C
        if (code === 113 || code === 81 || code === 3) {
          cleanup();
          stdout.write("\n");
          resolve();
          return;
        }

        // Arrow keys: \x1b[A, \x1b[B
        if (code === 27 && key.length >= 3) {
          const arrow = key.charCodeAt(2);
          if (arrow === 65) selected = Math.max(0, selected - 1); // up
          if (arrow === 66) selected = Math.min(servers.length - 1, selected + 1); // down
          servers = await readAndRender();
          return;
        }

        // SPACE: toggle
        if (code === 32 && servers[selected]) {
          const name = servers[selected].name;
          await toggleServer(name);
          servers = await readAndRender();
          return;
        }
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  });
}

export async function run(args) {
  if (!isTTYInteractive()) {
    await runNonInteractive(args);
    return;
  }

  // TTY でも args があるならサブコマンド優先
  if (args.length > 0) {
    await runNonInteractive(args);
    return;
  }

  await runInteractive();
}
