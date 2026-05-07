-- Phase L-2 (2026-05-07 user 検収 Library 真因 #2):
-- search_items_in_tag が avg 168ms / max 201ms と重い真因:
-- item_tags の PK は (item_id, tag_id) で、WHERE tag_id = ? の query で
-- SQLite が PK index を有効活用できない (composite PK の prefix 不一致)。
--
-- (tag_id, item_id) の secondary index を追加し、tag フィルタ時の検索を高速化。
-- 既存 PK は item delete cascade に必要なので削除しない。
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id, item_id);
