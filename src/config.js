import { promises as fs } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_PATH = join(homedir(), ".claude.json");
const BACKUP_PATH = join(homedir(), ".ccmcp_backup.json"); // 参照実装に合わせる

async function readJson(path, fallback) {
  try {
    const txt = await fs.readFile(path, "utf8");
    return JSON.parse(txt);
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

export async function loadClaudeFullConfig() {
  // claude.json が無い場合もあり得るので fallback 生成
  const full = await readJson(CONFIG_PATH, { mcpServers: {} });
  if (!full || typeof full !== "object") return { mcpServers: {} };
  if (!full.mcpServers || typeof full.mcpServers !== "object") full.mcpServers = {};
  return full;
}

export async function saveClaudeFullConfig(fullConfig) {
  // 既存キーは fullConfig 側で保持している前提
  await writeJsonAtomic(CONFIG_PATH, fullConfig);
}

export async function loadBackupConfig() {
  const backup = await readJson(BACKUP_PATH, { disabledServers: {} });
  if (!backup || typeof backup !== "object") return { disabledServers: {} };
  if (!backup.disabledServers || typeof backup.disabledServers !== "object") backup.disabledServers = {};
  return backup;
}

export async function saveBackupConfig(backupConfig) {
  await writeJsonAtomic(BACKUP_PATH, backupConfig);
}

export function getPaths() {
  return { CONFIG_PATH, BACKUP_PATH };
}

export async function listServers() {
  const full = await loadClaudeFullConfig();
  const backup = await loadBackupConfig();

  const enabled = Object.entries(full.mcpServers).map(([name, cfg]) => ({
    name,
    enabled: true,
    cfg
  }));

  const disabled = Object.entries(backup.disabledServers).map(([name, cfg]) => ({
    name,
    enabled: false,
    cfg
  }));

  // 見やすさのため name ソート（お好みで変更可）
  return [...enabled, ...disabled].sort((a, b) => a.name.localeCompare(b.name));
}

export async function toggleServer(name) {
  const full = await loadClaudeFullConfig();
  const backup = await loadBackupConfig();

  if (full.mcpServers[name]) {
    // disable: active -> backup
    backup.disabledServers[name] = full.mcpServers[name];
    delete full.mcpServers[name];

    await Promise.all([saveClaudeFullConfig(full), saveBackupConfig(backup)]);
    return { newState: false };
  }

  if (backup.disabledServers[name]) {
    // enable: backup -> active
    full.mcpServers[name] = backup.disabledServers[name];
    delete backup.disabledServers[name];

    await Promise.all([saveClaudeFullConfig(full), saveBackupConfig(backup)]);
    return { newState: true };
  }

  throw new Error(`Server '${name}' not found`);
}

export async function enableServer(name) {
  const servers = await listServers();
  const s = servers.find((x) => x.name === name);
  if (!s) throw new Error(`Server '${name}' not found`);
  if (s.enabled) return { newState: true };
  return toggleServer(name);
}

export async function disableServer(name) {
  const servers = await listServers();
  const s = servers.find((x) => x.name === name);
  if (!s) throw new Error(`Server '${name}' not found`);
  if (!s.enabled) return { newState: false };
  return toggleServer(name);
}
