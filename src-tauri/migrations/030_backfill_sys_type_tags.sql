-- audit batch (2026-05-13) #19: Library type tag 数値不整合 backfill。
--
-- 症状: 「タイプ別 (exe / url / folder / script / command)」 sidebar の
-- 件数が、 該当 items.item_type の件数と不一致になる。
--
-- 原因: 過去 migration / 旧バージョン経由で作られた一部 item は
-- sys-type-<type> tag が item_tags に登録されない状態で残っている
-- (auto-register paths が一部 sys tag attach を skip していた / 旧 batch 等)。
--
-- 対策: 全 item に対して、 自身の item_type に対応する sys-type-* tag が
-- 無ければ追加。 既存 entries は INSERT OR IGNORE で skip (idempotent)。
-- Library type tag count = items by type が常に一致するように backfill。

-- まず sys-type-* tag 自体が tags table に存在することを保証 (schema = id, name, is_hidden, is_system, prefix, icon, sort_order, created_at)
INSERT OR IGNORE INTO tags (id, name, is_hidden, is_system, prefix, icon, sort_order, created_at)
VALUES
    ('sys-type-exe',     'exe',     0, 1, NULL, NULL, 10, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ('sys-type-url',     'url',     0, 1, NULL, NULL, 11, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ('sys-type-folder',  'folder',  0, 1, NULL, NULL, 12, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ('sys-type-script',  'script',  0, 1, NULL, NULL, 13, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    ('sys-type-command', 'command', 0, 1, NULL, NULL, 14, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

-- 各 item に対して 「自身の item_type に対応する sys-type-* tag」 を attach。
-- item_tags.PRIMARY KEY = (item_id, tag_id) で重複は無視 (INSERT OR IGNORE)。 item_tags schema = (item_id, tag_id)。
INSERT OR IGNORE INTO item_tags (item_id, tag_id)
SELECT i.id, 'sys-type-' || i.item_type
FROM items i
WHERE i.item_type IN ('exe', 'url', 'folder', 'script', 'command');
