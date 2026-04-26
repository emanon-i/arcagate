-- Migration 017: drop watched_folders widget type (deprecated)
--
-- batch-87 PH-392: フロント未実装のまま放置されていた `watched_folders` widget を完全削除。
-- 既存レコードがあれば `projects` widget（同等機能）に統合する。
-- 個人プロジェクトのため UNIQUE 制約衝突は発生しないとみなす。

UPDATE workspace_widgets
SET widget_type = 'projects'
WHERE widget_type = 'watched_folders';
