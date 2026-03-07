-- 008_category_to_tag.sql
-- カテゴリをタグに統一し、システムタグ（item_type別 + workspace名）を導入する

-- tags テーブルに列追加
ALTER TABLE tags ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tags ADD COLUMN prefix TEXT;
ALTER TABLE tags ADD COLUMN icon TEXT;
ALTER TABLE tags ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- 既存カテゴリをタグへ移行（名前重複時はスキップ）
INSERT OR IGNORE INTO tags (id, name, is_hidden, is_system, prefix, icon, sort_order, created_at)
    SELECT id, name, 0, 0, prefix, icon, sort_order, created_at FROM categories;

-- item_categories → item_tags 移行
-- 名前衝突でカテゴリ→タグ変換がスキップされた場合は、同名タグのIDにマッピング
INSERT OR IGNORE INTO item_tags (item_id, tag_id)
    SELECT ic.item_id,
        COALESCE(
            (SELECT t.id FROM tags t WHERE t.id = ic.category_id),
            (SELECT t.id FROM tags t WHERE t.name = (SELECT c.name FROM categories c WHERE c.id = ic.category_id))
        )
    FROM item_categories ic;

-- item_type 別システムタグ作成
INSERT OR IGNORE INTO tags (id, name, is_hidden, is_system, sort_order)
    VALUES
        ('sys-type-exe',     'exe',     0, 1, -100),
        ('sys-type-url',     'url',     0, 1, -99),
        ('sys-type-folder',  'folder',  0, 1, -98),
        ('sys-type-script',  'script',  0, 1, -97),
        ('sys-type-command', 'command', 0, 1, -96);

-- 既存アイテムにシステムタグ自動付与
INSERT OR IGNORE INTO item_tags (item_id, tag_id)
    SELECT id, 'sys-type-' || item_type FROM items;

-- ワークスペース名のシステムタグ作成
INSERT OR IGNORE INTO tags (id, name, is_hidden, is_system, sort_order, created_at)
    SELECT 'sys-ws-' || id, name, 0, 1, -50, created_at FROM workspaces;

-- カテゴリテーブル削除
DROP TABLE IF EXISTS item_categories;
DROP TABLE IF EXISTS categories;
