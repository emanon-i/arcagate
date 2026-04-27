-- PH-504: Per-item settings persistence (案 C: 論理削除なし、別テーブル管理)
-- WatchFolder 等で entries を unset/re-set しても per-item の opener / favorite / custom_label / custom_icon
-- を残すため、widget_id + item_key (relative path) の primary key で永続化する。
-- entries 自体は filesystem からの derived state、本テーブルは override / 注釈の保存箱。

CREATE TABLE IF NOT EXISTS widget_item_settings (
    widget_id    TEXT NOT NULL,
    item_key     TEXT NOT NULL,
    opener       TEXT,
    custom_label TEXT,
    custom_icon  TEXT,
    favorite     INTEGER NOT NULL DEFAULT 0,
    last_seen_at INTEGER,
    created_at   INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at   INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (widget_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_widget_item_settings_widget
    ON widget_item_settings(widget_id);

CREATE INDEX IF NOT EXISTS idx_widget_item_settings_last_seen
    ON widget_item_settings(last_seen_at);
