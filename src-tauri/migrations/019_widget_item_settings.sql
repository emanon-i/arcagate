-- PH-issue-023 Phase B: per-item settings 永続テーブル。
--
-- watched_path unset → item 削除でも、user の個別設定 (default_app / is_enabled) を
-- 別 table に snapshot として残し、再 watch 時に同 path で resurrect する。
--
-- key 設計: item.target (絶対 path) を unique key として使用。
-- item.id は UUID v7 で再生成毎に変わるため key には不向き。target は安定。
--
-- 旧 PH-504 (rollback で revert) で同名 table を実装、SQL は失われたが既存環境に
-- 残存している可能性。CREATE TABLE IF NOT EXISTS で冪等。
CREATE TABLE IF NOT EXISTS widget_item_settings (
    item_key      TEXT PRIMARY KEY,
    settings_json TEXT NOT NULL,
    last_seen_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_widget_item_settings_seen
    ON widget_item_settings(last_seen_at);
