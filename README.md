# mcp-toggle

Claude Code（`~/.claude.json`）と Codex CLI（`~/.codex/config.toml`）の MCP サーバーを有効化/無効化するCLIツール

## 特徴

- インタラクティブな TUI（矢印キー + スペースで切り替え）
- サブコマンドによるスクリプト対応
- 対象（`claude` / `codex`）を引数で切り替え（省略時は `claude`）

## インストール

### npx で直接実行（GitHub から）

```bash
npx --yes github:TomCat2357/McpConfig
```

`npx github:...` が無反応のまま止まる場合は、GitHub への接続方式（SSH 認証待ち等）で詰まっている可能性があります。HTTPS を明示して実行してください：

```bash
npx --yes --package git+https://github.com/TomCat2357/McpConfig.git mcp-toggle claude
```

### グローバルインストール

```bash
npm install -g github:TomCat2357/McpConfig
mcp-toggle claude
```

`npm install -g github:...` が止まる場合：

```bash
npm install -g git+https://github.com/TomCat2357/McpConfig.git
```

### ローカル開発

```bash
git clone https://github.com/TomCat2357/McpConfig.git
cd McpConfig
chmod +x bin/mcp-toggle.js
npm link
```

## 使い方

### インタラクティブモード

```bash
mcp-toggle claude
```

または

```bash
npx --yes github:TomCat2357/McpConfig
```

対象を `codex` にする場合：

```bash
mcp-toggle codex
```

操作方法：
- `↑/↓` : カーソル移動
- `SPACE` : 有効/無効の切り替え
- `Q` : 終了

### コマンドラインモード

```bash
# サーバー一覧表示
mcp-toggle claude list
mcp-toggle codex list

# 特定サーバーの切り替え
mcp-toggle claude toggle サーバー名
mcp-toggle codex toggle サーバー名

# 特定サーバーを有効化
mcp-toggle claude enable サーバー名
mcp-toggle codex enable サーバー名

# 特定サーバーを無効化
mcp-toggle claude disable サーバー名
mcp-toggle codex disable サーバー名

# ヘルプ表示
mcp-toggle claude help
```

## 動作

- **有効化**: バックアップ側（`disabledServers`）から設定側（Claude: `mcpServers` / Codex: `mcp_servers`）に移動
- **無効化**: 設定側（Claude: `mcpServers` / Codex: `mcp_servers`）からバックアップ側（`disabledServers`）に移動

対象別のファイル：
- **claude**: `~/.claude.json`, `~/.ccmcp_backup.json`
- **codex**: `~/.codex/config.toml`, `~/.codex/ccmcp_backup.toml`

## 必要要件

- Node.js >= 20

## ライセンス

MIT
