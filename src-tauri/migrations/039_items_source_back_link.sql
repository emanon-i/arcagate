-- PH-CF-100 (2026-05-23 user 承認): 監視アイテムの逆方向ライフサイクル data model。
--
-- 既存 `widget_item_hides` (029) は widget 右クリック「この widget から外す」 専用で、
-- Library 削除と一切連動していなかった。 加えて監視自動登録 item に「どの widget が作ったか」
-- の back-link が存在せず、 reconcile は target パス一致 (`find_by_target`) でしか重複判定
-- できなかったため、 user が Library 削除しても次の scan で新 UUID で復活していた (モグラ叩き)。
--
-- 本 migration:
--   - `items.source_widget_id` (FK→workspace_widgets ON DELETE SET NULL):
--     どの監視 widget が自動登録したか。 NULL = user 作成 / 監視非由来。
--     widget が削除された item は SET NULL で「監視非由来 = user-owned 通常 item」に降格し、
--     Library に残る (user が明示的に削除しない限り)。
--   - `items.source_entry_key` (TEXT NULL):
--     scan reconcile の entry id。 `widget_item_hides.item_target` と同じ key 空間で揃える:
--       - projects: 第1階層フォルダの正規化済 絶対パス (= item.target と一致)
--       - exe_folder: 第1階層フォルダの正規化済 絶対パス (≠ item.target で exe ファイルパス)
--     片肺 (一方だけ NOT NULL) は契約違反 → audit query で検出する。
--
-- 既存 `items` 行は NULL (= 監視非由来扱い、 過去自動登録の legacy item は user 削除しても
-- 復活する従来挙動を維持)。 新規 scan 以降に逆方向ライフサイクルが有効になる。

ALTER TABLE items ADD COLUMN source_widget_id TEXT
    REFERENCES workspace_widgets(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN source_entry_key TEXT;

-- reconcile の重複判定 query (`SELECT ... WHERE source_widget_id = ? AND source_entry_key = ?`)
-- 用の covering index。 source_widget_id NULL 行は除外して legacy item の影響を受けない。
CREATE INDEX idx_items_source ON items(source_widget_id, source_entry_key)
    WHERE source_widget_id IS NOT NULL;
