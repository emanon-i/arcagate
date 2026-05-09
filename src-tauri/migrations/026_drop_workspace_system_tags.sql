-- G-7 (2026-05-09 user 検収): workspace 名 system tag (sys-ws-*) 機能ごと撤去。
-- 「workspace に乗っている item は workspace 名 が自動付与される」 機能の DB 痕跡を削除。
--
-- 削除順:
--   1. item_tags 経由の関連 row (FK 制約相当の整合性)
--   2. tags 本体 (id LIKE 'sys-ws-%')
--
-- 他 system tag (sys-starred / sys-type-*) は touch しない。

DELETE FROM item_tags WHERE tag_id LIKE 'sys-ws-%';
DELETE FROM tags WHERE id LIKE 'sys-ws-%';
