---
id: PH-20260427-444
status: todo
batch: 97
type: 防衛
era: Distribution Era + Codex Q5 残
---

# PH-444: bulk tag e2e + vitest (Codex Q5 #2 残)

## 問題

batch-96 PH-436 で bulk tag UI を minimal scope で実装、テスト未充足。
Codex 3 回目 Q5 #2: 「PH-436 wip」指摘 → minimal scope で done 化したが、テスト整備で実装の信頼度を担保。

## 改修

### Rust 単体テスト

`src-tauri/src/services/item_service.rs` に追加:

- `bulk_add_tag` で 5 件 add → 全件に item_tags 行が存在
- `bulk_add_tag` で空 vec → 0 件返却
- `bulk_add_tag` で 1001 件 → InvalidInput エラー
- `bulk_remove_tag` 同様 (3 ケース)
- `bulk_delete_items` で transaction atomic 性確認 (途中失敗で全 rollback)

### vitest

- `src/lib/ipc/items.test.ts` (新設) で bulkAddTag / bulkRemoveTag / bulkDeleteItems wrapper 単体
  - mock invoke で関数呼び出しの引数が正しく渡されることを検証

### e2e

`tests/e2e/library-bulk-tag.spec.ts` (新設):

- 5 件アイテム作成 (CDP 経由 createItem)
- 「複数選択」ボタンクリック → selectionMode ON
- 5 件のカードを順番にクリック → action bar に「5 件選択中」
- 「お気に入りに追加」 → toast「5 件をお気に入りに追加しました」
- LibrarySidebar の「お気に入り」フィルタクリック → 5 件表示確認
- cleanup: 5 件 deleteItem

### 受け入れ条件

- [ ] services::item_service::tests に bulk 系 6 ケース以上追加
- [ ] src/lib/ipc/items.test.ts 新設、3 wrapper の引数検証
- [ ] tests/e2e/library-bulk-tag.spec.ts 新設、selectionMode → bulk add → filter 確認
- [ ] `pnpm verify` 全通過

### Codex Q5 #2 完了化

これで bulk tag UI の信頼度担保 + 残機能 (任意タグ popover / Shift 範囲) は別 plan で別途。
