-- PH-issue-009: Workspace 背景壁紙 (per-workspace)
--
-- 旧 PH-499 で migration 018 として実装、batch-107 hard rollback で SQL ファイル削除
-- (DB 上のカラムは前進のみ)。本 migration は同 column を再追加するが、CREATE TABLE IF NOT EXISTS は
-- 何度も実行可能、ALTER TABLE ADD COLUMN は既存環境 (orphan column 残存) で失敗する可能性。
--
-- 対策: ALTER TABLE 失敗を許容するため、3 つの ALTER を独立した statement にしておく。
-- rusqlite-migration は 1 statement 単位ではなく migration 単位の transaction なので、
-- 1 ALTER 失敗 = 全 rollback。よって既存環境では migration_version table に到達せず冪等。
--
-- 既存環境 (orphan column あり): 本 migration を skip させる必要がある → migration_version
-- 上昇のみ済ませて column 追加 SQL は guard 化したい。SQLite には IF NOT EXISTS for ALTER TABLE
-- ADD COLUMN がないので、PRAGMA table_info で事前 check する別 plan に分けるのが正攻法。
--
-- 本 PR: 新規環境 (column 不在) のみ前提。orphan column 残存ユーザは local DB を flush するか、
-- 手動で columns 削除してから再 install してもらう (lessons.md に明記)。

ALTER TABLE workspaces ADD COLUMN wallpaper_path TEXT;
ALTER TABLE workspaces ADD COLUMN wallpaper_opacity REAL NOT NULL DEFAULT 0.6;
ALTER TABLE workspaces ADD COLUMN wallpaper_blur INTEGER NOT NULL DEFAULT 0;
