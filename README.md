# claude-mcp-toggle

~/.claude.json の MCP サーバーを有効化/無効化するCLIツール

## 特徴

- インタラクティブな TUI（矢印キー + スペースで切り替え）
- サブコマンドによるスクリプト対応
- ~/.claude.json の mcpServers を ~/.ccmcp_backup.json に退避/復帰

## インストール

### npx で直接実行（GitHub から）

```bash
npx github:TomCat2357/claude-mcp-toggle
```

### グローバルインストール

```bash
npm install -g github:TomCat2357/claude-mcp-toggle
claude-mcp-toggle
```

### ローカル開発

```bash
git clone https://github.com/TomCat2357/claude-mcp-toggle.git
cd claude-mcp-toggle
chmod +x bin/claude-mcp-toggle.js
npm link
```

## 使い方

### インタラクティブモード

```bash
claude-mcp-toggle
```

または

```bash
npx github:TomCat2357/claude-mcp-toggle
```

操作方法：
- `↑/↓` : カーソル移動
- `SPACE` : 有効/無効の切り替え
- `Q` : 終了

### コマンドラインモード

```bash
# サーバー一覧表示
claude-mcp-toggle list

# 特定サーバーの切り替え
claude-mcp-toggle toggle サーバー名

# 特定サーバーを有効化
claude-mcp-toggle enable サーバー名

# 特定サーバーを無効化
claude-mcp-toggle disable サーバー名

# ヘルプ表示
claude-mcp-toggle help
```

## 動作

- **有効化**: ~/.ccmcp_backup.json の disabledServers から ~/.claude.json の mcpServers に移動
- **無効化**: ~/.claude.json の mcpServers から ~/.ccmcp_backup.json の disabledServers に移動

## 必要要件

- Node.js >= 20

## ライセンス

MIT
