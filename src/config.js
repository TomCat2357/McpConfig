import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

let tomlModule;
async function getToml() {
  if (!tomlModule) {
    tomlModule = await import("@iarna/toml");
  }
  return tomlModule;
}

const CLAUDE_CONFIG_PATH = join(homedir(), ".claude.json");
const CLAUDE_BACKUP_PATH = join(homedir(), ".ccmcp_backup.json"); // 参照実装に合わせる

const CODEX_CONFIG_PATH = join(homedir(), ".codex", "config.toml");
const CODEX_BACKUP_PATH = join(homedir(), ".codex", "ccmcp_backup.toml");

function normalizeTarget(target) {
  return target === "codex" ? "codex" : "claude";
}

function preferredMcpServersKey(target) {
  return normalizeTarget(target) === "codex" ? "mcp_servers" : "mcpServers";
}

function getTargetPaths(target) {
  const t = normalizeTarget(target);
  if (t === "codex") {
    return { CONFIG_PATH: CODEX_CONFIG_PATH, BACKUP_PATH: CODEX_BACKUP_PATH, format: "toml" };
  }
  return { CONFIG_PATH: CLAUDE_CONFIG_PATH, BACKUP_PATH: CLAUDE_BACKUP_PATH, format: "json" };
}

async function readJson(path, fallback) {
  try {
    const txt = await fs.readFile(path, "utf8");
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

async function readToml(path, fallback) {
  try {
    const txt = await fs.readFile(path, "utf8");
    const TOML = await getToml();
    const parsed = TOML.parse(txt);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(path, obj) {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  const txt = JSON.stringify(obj, null, 2) + "\n";
  await fs.writeFile(tmp, txt, "utf8");
  await fs.rename(tmp, path);
}

async function writeTomlAtomic(path, obj) {
  await fs.mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  const TOML = await getToml();
  const txt = TOML.stringify(obj) + "\n";
  await fs.writeFile(tmp, txt, "utf8");
  await fs.rename(tmp, path);
}

function ensureMcpServers(fullConfig, preferredKey = "mcpServers") {
  if (!fullConfig || typeof fullConfig !== "object") fullConfig = {};

  const hasCamel = fullConfig.mcpServers && typeof fullConfig.mcpServers === "object";
  const hasSnake = fullConfig.mcp_servers && typeof fullConfig.mcp_servers === "object";

  // codex(TOML) では mcp_servers を正とする（既存の mcpServers をあれば移行）
  if (preferredKey === "mcp_servers" && hasCamel && !hasSnake) {
    fullConfig.mcp_servers = fullConfig.mcpServers;
    delete fullConfig.mcpServers;
  }

  const hasPreferred =
    fullConfig[preferredKey] && typeof fullConfig[preferredKey] === "object";
  const key = hasPreferred
    ? preferredKey
    : fullConfig.mcpServers && typeof fullConfig.mcpServers === "object"
      ? "mcpServers"
      : fullConfig.mcp_servers && typeof fullConfig.mcp_servers === "object"
        ? "mcp_servers"
        : preferredKey;

  if (!fullConfig[key] || typeof fullConfig[key] !== "object") fullConfig[key] = {};
  return { fullConfig, key, mcpServers: fullConfig[key] };
}

function ensureDisabledServers(backupConfig) {
  if (!backupConfig || typeof backupConfig !== "object") backupConfig = {};

  const hasCamel =
    backupConfig.disabledServers && typeof backupConfig.disabledServers === "object";
  const hasSnake =
    backupConfig.disabled_servers && typeof backupConfig.disabled_servers === "object";
  const key = hasCamel ? "disabledServers" : hasSnake ? "disabled_servers" : "disabledServers";

  if (!backupConfig[key] || typeof backupConfig[key] !== "object") backupConfig[key] = {};
  return { backupConfig, key, disabledServers: backupConfig[key] };
}

async function loadFullConfig(target) {
  const { CONFIG_PATH, format } = getTargetPaths(target);
  const key = preferredMcpServersKey(target);
  if (format === "toml") {
    const { fullConfig } = ensureMcpServers(await readToml(CONFIG_PATH, {}), key);
    return fullConfig;
  }
  const { fullConfig } = ensureMcpServers(await readJson(CONFIG_PATH, {}), key);
  return fullConfig;
}

async function saveFullConfig(target, fullConfig) {
  const { CONFIG_PATH, format } = getTargetPaths(target);
  const key = preferredMcpServersKey(target);
  const { fullConfig: normalized } = ensureMcpServers(fullConfig, key);
  if (format === "toml") {
    await writeTomlAtomic(CONFIG_PATH, normalized);
    return;
  }
  await writeJsonAtomic(CONFIG_PATH, normalized);
}

async function loadBackupConfig(target) {
  const { BACKUP_PATH, format } = getTargetPaths(target);
  if (format === "toml") {
    const { backupConfig } = ensureDisabledServers(await readToml(BACKUP_PATH, {}));
    return backupConfig;
  }
  const { backupConfig } = ensureDisabledServers(await readJson(BACKUP_PATH, {}));
  return backupConfig;
}

async function saveBackupConfig(target, backupConfig) {
  const { BACKUP_PATH, format } = getTargetPaths(target);
  const { backupConfig: normalized } = ensureDisabledServers(backupConfig);
  if (format === "toml") {
    await writeTomlAtomic(BACKUP_PATH, normalized);
    return;
  }
  await writeJsonAtomic(BACKUP_PATH, normalized);
}

export function getPaths(target) {
  const { CONFIG_PATH, BACKUP_PATH } = getTargetPaths(target);
  return { CONFIG_PATH, BACKUP_PATH };
}

export async function listServers(target = "claude") {
  const full = await loadFullConfig(target);
  const backup = await loadBackupConfig(target);

  const { mcpServers } = ensureMcpServers(full, preferredMcpServersKey(target));
  const { disabledServers } = ensureDisabledServers(backup);

  const enabled = Object.entries(mcpServers).map(([name, cfg]) => ({
    name,
    enabled: true,
    cfg
  }));

  const disabled = Object.entries(disabledServers).map(([name, cfg]) => ({
    name,
    enabled: false,
    cfg
  }));

  // 見やすさのため name ソート（お好みで変更可）
  return [...enabled, ...disabled].sort((a, b) => a.name.localeCompare(b.name));
}

export async function toggleServer(target = "claude", name) {
  const full = await loadFullConfig(target);
  const backup = await loadBackupConfig(target);

  const { mcpServers } = ensureMcpServers(full, preferredMcpServersKey(target));
  const { disabledServers } = ensureDisabledServers(backup);

  if (mcpServers[name]) {
    // disable: active -> backup
    disabledServers[name] = mcpServers[name];
    delete mcpServers[name];

    await Promise.all([saveFullConfig(target, full), saveBackupConfig(target, backup)]);
    return { newState: false };
  }

  if (disabledServers[name]) {
    // enable: backup -> active
    mcpServers[name] = disabledServers[name];
    delete disabledServers[name];

    await Promise.all([saveFullConfig(target, full), saveBackupConfig(target, backup)]);
    return { newState: true };
  }

  throw new Error(`Server '${name}' not found`);
}

export async function enableServer(target = "claude", name) {
  const servers = await listServers(target);
  const s = servers.find((x) => x.name === name);
  if (!s) throw new Error(`Server '${name}' not found`);
  if (s.enabled) return { newState: true };
  return toggleServer(target, name);
}

export async function disableServer(target = "claude", name) {
  const servers = await listServers(target);
  const s = servers.find((x) => x.name === name);
  if (!s) throw new Error(`Server '${name}' not found`);
  if (!s.enabled) return { newState: false };
  return toggleServer(target, name);
}
