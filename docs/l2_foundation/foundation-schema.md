# Foundation §4: SQLite スキーマ

[foundation.md](./foundation.md) §4 詳細。テーブル定義 / インデックス / migration 設計。

## 4. SQLiteスキーマ

001〜010 のマイグレーションが実装済み。今後は段階的にマイグレーションで追加する。

```sql
-- 001_initial.sql

-- アプリケーション設定 (key-value)
CREATE TABLE config (
    key         TEXT    PRIMARY KEY,
    value       TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 統一アイテムモデル
CREATE TABLE items (
    id          TEXT    PRIMARY KEY,  -- UUID v7
    item_type   TEXT    NOT NULL,     -- 'exe' | 'url' | 'folder' | 'script' | 'command'
    label       TEXT    NOT NULL,
    target      TEXT    NOT NULL,     -- 実行パス / URL / フォルダパス / スクリプトパス / コマンド文字列
    args        TEXT,                 -- 起動引数
    working_dir TEXT,                 -- 作業ディレクトリ
    icon_path   TEXT,                 -- アイコンファイルパス (app_data_dir/icons/{id}.png)
    icon_type   TEXT,                 -- 'png' | 'ico' | 'svg'
    aliases     TEXT,                 -- JSON配列: ["blen3", "blender3"]
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_enabled  INTEGER NOT NULL DEFAULT 1,
    is_tracked  INTEGER NOT NULL DEFAULT 1,   -- フォルダ監視対象フラグ (PH-003-M)
    default_app TEXT,                          -- フォルダを開くデフォルトアプリ (PH-003-M)
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_label ON items(label COLLATE NOCASE);
CREATE INDEX idx_items_enabled ON items(is_enabled);

-- タグ（008 でカテゴリを統合済み）
CREATE TABLE tags (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    is_hidden   INTEGER NOT NULL DEFAULT 0,   -- センシティブコンテンツ隠蔽フラグ
    is_system   INTEGER NOT NULL DEFAULT 0,   -- システムタグフラグ (PH-003-N)
    prefix      TEXT,                          -- 名前空間プレフィックス (PH-003-N)
    icon        TEXT,                          -- アイコン (PH-003-N)
    sort_order  INTEGER NOT NULL DEFAULT 0,   -- ソート順 (PH-003-N)
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- アイテム-タグ関連 (多対多)
CREATE TABLE item_tags (
    item_id     TEXT    NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id      TEXT    NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

-- 起動ログ
CREATE TABLE launch_log (
    id          TEXT    PRIMARY KEY,
    item_id     TEXT    NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    launched_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    launch_source TEXT  NOT NULL DEFAULT 'palette'  -- 'palette' | 'tray' | 'cli' | 'mcp'
);

CREATE INDEX idx_launch_log_item ON launch_log(item_id);
CREATE INDEX idx_launch_log_time ON launch_log(launched_at DESC);

-- 起動統計 (denormalized)
CREATE TABLE item_stats (
    item_id         TEXT    PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    launch_count    INTEGER NOT NULL DEFAULT 0,
    last_launched_at TEXT
);
```

```sql
-- 002_mcp_permissions.sql
-- ※ MCP パーミッション管理テーブル。007_drop_mcp_permissions.sql で DROP 済み
```

```sql
-- 003_watched_paths.sql

-- ファイルシステム監視対象パス
CREATE TABLE IF NOT EXISTS watched_paths (
    id         TEXT PRIMARY KEY,
    path       TEXT NOT NULL UNIQUE,
    label      TEXT,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
```

```sql
-- 004_workspaces.sql

-- ワークスペース
CREATE TABLE IF NOT EXISTS workspaces (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ワークスペースウィジェット
-- widget_type: 'favorites' | 'recent' | 'projects' | 'watched_folders'
CREATE TABLE IF NOT EXISTS workspace_widgets (
    id           TEXT    PRIMARY KEY,
    workspace_id TEXT    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    widget_type  TEXT    NOT NULL,
    position_x   INTEGER NOT NULL DEFAULT 0,
    position_y   INTEGER NOT NULL DEFAULT 0,
    width        INTEGER NOT NULL DEFAULT 2,
    height       INTEGER NOT NULL DEFAULT 2,
    config       TEXT,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_widgets_workspace
    ON workspace_widgets(workspace_id);
```

```sql
-- 005_mcp_workspace_permissions.sql
-- ※ MCP workspace パーミッション追加。007_drop_mcp_permissions.sql で DROP 済み
```

```sql
-- 006_themes.sql

-- テーマ管理
CREATE TABLE IF NOT EXISTS themes (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL UNIQUE,
    base_theme TEXT    NOT NULL DEFAULT 'dark',   -- 'light' | 'dark'
    css_vars   TEXT    NOT NULL DEFAULT '{}',      -- JSON: CSS 変数オーバーライド
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
```

### スキーマ設計方針

| 決定                             | 理由                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| UUID v7 をIDに使用               | 時刻ソート可能。インポート/エクスポート時のID衝突回避                                                                                               |
| ISO 8601テキストでタイムスタンプ | SQLiteにネイティブdatetimeなし。TEXTはソート可能・可読性あり                                                                                        |
| `aliases` をJSON配列で格納       | 1アイテムあたり1〜5件程度。別テーブルより簡潔。`json_each()` でクエリ可能。アイテム数が1000件を超えた場合は `item_aliases` テーブルへの正規化を検討 |
| アイコンをファイルシステムに格納 | base64 TEXT比で33%の容量削減。検索クエリでアイコンデータをロードしない。`app_data_dir/icons/` に保存しパスのみDBに保持                              |
| `item_stats` テーブルで非正規化  | 検索のたびに `COUNT(*)` を避ける。Service層またはトリガーで更新                                                                                     |
| `ON DELETE CASCADE`              | 参照整合性を保証。`PRAGMA foreign_keys = ON` で有効化                                                                                               |
| マイグレーション方針             | 001〜010 実装済み。002/005 は 007 で DROP 済み。008 でカテゴリをタグに統一。今後は `011_` 以降で段階的に追加                                        |
