---
status: done
sub_phase: PH-003-C
feature_id: F-20260226-015
priority: 3
---

# PH-003-C: MCP サーバー

**対応REQ**: REQ-20260226-011
**元機能**: F-20260226-015
**前提**: PH-003-A 完了（arcagate_cli バイナリが存在すること）

`arcagate_cli mcp` サブコマンドで起動する stdio JSON-RPC 2.0 MCP サーバーを実装する。
Claude Code から Arcagate のアイテムを自然言語で操作できるようにする。

## 技術要素

外部 MCP クレート不使用。JSON-RPC 2.0 手実装（約300行）:

```
src-tauri/src/mcp/
├── mod.rs      ← arcagate_cli の mcp サブコマンドエントリ
├── server.rs   ← stdin/stdout JSON-RPC ループ
└── tools.rs    ← 4ツール定義（Service Layer 経由）
```

### MCPツール一覧

| ツール名          | 操作             | 権限  |
| ----------------- | ---------------- | ----- |
| `arcagate_list`   | 全アイテム一覧   | read  |
| `arcagate_search` | 名前/メモで検索  | read  |
| `arcagate_launch` | アイテム起動     | write |
| `arcagate_create` | アイテム新規登録 | write |

### パーミッション管理

- `mcp_permissions` テーブルでツールごとの read/write 許可を管理
- デフォルト: read-only（list / search のみ許可）
- write 操作は明示的に許可が必要

## DB マイグレーション

`src-tauri/migrations/002_mcp_permissions.sql`:

```sql
CREATE TABLE IF NOT EXISTS mcp_permissions (
    id TEXT PRIMARY KEY,
    tool_name TEXT NOT NULL UNIQUE,
    is_allowed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
-- デフォルト: read-only（generate_uuid() は SQLite 非標準のため固定 UUID v7 + INSERT OR IGNORE を使用）
INSERT OR IGNORE INTO mcp_permissions (id, tool_name, is_allowed) VALUES
    ('01900000-0000-7001-8000-000000000001', 'arcagate_list',   1),
    ('01900000-0000-7001-8000-000000000002', 'arcagate_search', 1),
    ('01900000-0000-7001-8000-000000000003', 'arcagate_launch', 0),
    ('01900000-0000-7001-8000-000000000004', 'arcagate_create', 0);
```

## セットアップ自動化

`arcagate_cli mcp --setup` で Claude Code の設定ファイルを自動更新:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Claude Code settings: `~/.claude.json` の `mcpServers` セクション

## 受け入れ条件

- [x] `arcagate_cli mcp` で MCP サーバーが起動し、stdin/stdout で JSON-RPC 通信できる
- [x] Claude Code から `arcagate_list` でアイテム一覧を取得できる
- [x] Claude Code から `arcagate_search` でアイテムを検索できる
- [x] Claude Code から `arcagate_launch` でアイテムを起動できる（write 許可後）
- [x] Claude Code から `arcagate_create` でアイテムを新規登録できる（write 許可後）
- [x] write 操作を未許可状態で呼び出すとエラーが返る
- [x] `arcagate_cli mcp --setup` で設定ファイルが自動更新される
- [x] `pnpm verify` が全通過する
