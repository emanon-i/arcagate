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
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_label ON items(label COLLATE NOCASE);
CREATE INDEX idx_items_enabled ON items(is_enabled);

-- カテゴリ
CREATE TABLE categories (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    prefix      TEXT    UNIQUE,       -- 名前空間プレフィックス (M2a用、例: "gm")
    icon        TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- アイテム-カテゴリ関連 (多対多)
CREATE TABLE item_categories (
    item_id     TEXT    NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    category_id TEXT    NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, category_id)
);

-- タグ
CREATE TABLE tags (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    is_hidden   INTEGER NOT NULL DEFAULT 0,  -- センシティブコンテンツ隠蔽フラグ
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
