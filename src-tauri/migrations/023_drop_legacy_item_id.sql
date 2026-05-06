-- V9 解消 (A3 PR-H): workspace_widgets.config 内の legacy `item_id` (single) を
-- `item_ids` (array) に詰め替え、新形式統一。
--
-- 旧形式: `{ "item_id": "uuid", ... }`
-- 新形式: `{ "item_ids": ["uuid"], ... }`
--
-- 詰め替え logic:
--   1. `item_ids` が既にあり非空 → そのまま、`item_id` キーだけ削除
--   2. `item_ids` が無い or 空 + `item_id` あり → `item_ids = [item_id]` に詰め替え + `item_id` 削除
--   3. 両方なし → no-op (item type 以外の widget)
--
-- SQLite json1 module の json_set / json_remove / json_extract / json_array_length / json_array を使用。
-- Tauri SQLite は json1 を組み込み (default feature)。
UPDATE workspace_widgets
SET config = (
    CASE
        -- item_ids 既存 (非空) → item_id 削除のみ
        WHEN json_extract(config, '$.item_ids') IS NOT NULL
            AND json_array_length(json_extract(config, '$.item_ids')) > 0
            THEN json_remove(config, '$.item_id')
        -- item_id あり (item_ids 無 or 空) → item_ids に詰め替え + item_id 削除
        WHEN json_extract(config, '$.item_id') IS NOT NULL
            THEN json_remove(
                json_set(
                    config,
                    '$.item_ids',
                    json_array(json_extract(config, '$.item_id'))
                ),
                '$.item_id'
            )
        ELSE config
    END
)
WHERE json_extract(config, '$.item_id') IS NOT NULL;
