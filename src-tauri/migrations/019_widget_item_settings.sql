-- Migration 019: Per-item settings persistence (PH-504)
--
-- ユーザー fb (2026-04-28、検収項目 #33):
-- > フォルダ監視のアンセットでライブラリからもアイテムは消すべきだけど、
-- > 各アイテムの設定は残しておいて欲しい。
-- > 間違って消したり戻したくなったら過去の設定が残っててよみがえる。
--
-- 採用: 案 C = entries は揮発 / settings は別テーブルで永続 (論理削除なし)
--
-- (widget_id, item_key) を PK とする per-item override 設定を保持。
-- entries 自体は filesystem 由来の derived state で揮発、本テーブルは setting のみ。
-- unset しても残るので path 戻し時に旧設定が自動 resurrect する。

CREATE TABLE IF NOT EXISTS widget_item_settings (
    widget_id TEXT NOT NULL,
    item_key TEXT NOT NULL,
    opener TEXT,
    custom_label TEXT,
    custom_icon TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
    last_seen_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (widget_id, item_key),
    FOREIGN KEY (widget_id) REFERENCES workspace_widgets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_widget_item_settings_widget
    ON widget_item_settings(widget_id);

CREATE INDEX IF NOT EXISTS idx_widget_item_settings_last_seen
    ON widget_item_settings(last_seen_at);
