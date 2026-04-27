---
id: PH-20260427-474
title: Widget Item Picker = LibraryCard 再利用 + 複数選択 + Collection Widget
status: done
batch: 107
era: polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte
  - src/lib/components/arcagate/workspace/widgets/CollectionWidget.svelte (new)
  - src/lib/components/arcagate/library/LibraryGrid.svelte
  - src/lib/components/arcagate/library/LibraryCard.svelte
  - src/lib/components/arcagate/workspace/ItemPicker.svelte (new)
  - src-tauri/src/models/workspace.rs (WidgetType enum + collection)
  - src-tauri/src/commands/item_commands.rs (delete cascade)
---

# PH-474: Widget Item Picker = LibraryCard 再利用 + 複数選択 + Collection Widget

## 背景

ユーザー dev fb (2026-04-27):

> ウィジットのアイテムが置けるやつ、これ普通にライブラリ画面のカードを出すの無理？それで良くないか？
> あと複数追加できるようにしてね。つまるところ自由に選択して配置できるライブラリ画面の小さい版ウィジット。
> あとアイテム選択の設定画面、ソートとかフィルタつけないと厳しいよ。
> あと当然だけどウィジットのアイテム消えたらライブラリ側も消えるよね？

現状:

- WidgetSettingsDialog.svelte は `widgetRegistry` から動的に SettingsContent を取得
- ItemWidget (1 item only) で item 選択 UI がある (おそらく id 入力 or simple select)
- LibraryCard は `viewMode 'grid'/'list'`, `itemSize 'S'/'M'/'L'` の variant 完備、再利用可能
- `cmd_delete_item` は cascade なし → widget config 内の dead reference 残存

## 受け入れ条件

### 機能

- [x] **複数アイテム表示**: ItemWidget が `item_ids: string[]` 設定時に LibraryCard の grid 表示に切り替え (実装は新 widget type ではなく既存 ItemWidget の config schema 拡張、後方互換維持)
- [x] **ItemPicker モーダル**: LibraryItemPicker を LibraryCard grid + checkbox overlay + 選択 ring + 「N 件を追加」フッターで全面リライト
- [x] **ソート / フィルタ**: Picker 内に sort セレクト (登録順 / 名前順 / 更新順) を実装、検索フィルタは既存 itemStore 流用
- [x] **複数選択**: 各カード click で toggle、`selectedIds: Set<string>` 管理、確定で onConfirm 発火
- [x] **既存 ItemWidget**: 複数選択時は LibraryCard grid (72px min)、単一時は既存 LibraryCard 単体表示
- [x] **Library 削除 ↔ widget 同期**: `services/item_service.rs:purge_item_from_widget_configs` を追加、`delete_item` から呼び出し。`item_id` null 化 + `item_ids` から該当 ID 削除 (best-effort、JSON parse 失敗は skip)
- [x] dead reference: item 削除後に widget config 内の参照が自動消去、widget はゼロ件状態に戻り「アイテムを選択」UI 表示

### 横展開チェック

- [x] LibraryCard 既存 API (onclick) のまま再利用、改変不要 (selection overlay は picker 側で wrapper 描画)
- [x] Library フィルタ / ソート: itemStore.items を picker で再利用、独立 sort 実装で UI scope 限定 (将来 LibraryGrid と統合余地あり、今 scope 外)
- [x] WidgetType::Collection 新 enum 追加は scope 外 (既存 ItemWidget config 拡張で要件達成、UX 変化なし)

### SFDIPOT

- **F**unction: item 選択 → widget 反映 / item 削除 → widget 反映
- **D**ata: widget config = `{ item_ids: string[], sort?: ..., filter?: ... }`
- **I**nterface: LibraryCard `mode='picker'` 拡張、cmd_delete_item に cascade 追加
- **P**latform: dialog 内 scroll、keyboard tab navigation
- **O**perations: 単一クリック / Cmd+click / Shift+click / 全選択 / 全解除

### HICCUPPS

- [Image] Photos / Spotlight / Raycast の multi-select 慣習
- [User] 「ライブラリ画面の小さい版」の期待を直訳
- [Consistency] LibraryGrid の見た目をそのまま継承 (再学習不要)

## 実装ステップ

1. Rust 側: `WidgetType::Collection` enum 追加、`workspace_widgets` への config schema (`item_ids: Vec<String>`)
2. ts-rs export 再実行 → bindings 更新
3. `LibraryCard.svelte`: `mode?: 'picker'` `selected?: boolean` `onToggle?: () => void` 追加、picker 時は overlay checkbox
4. `LibraryGrid.svelte`: `mode?: 'picker' | 'normal'` `selectedIds?: Set<string>` 追加、click hijack
5. `ItemPicker.svelte` (new): LibraryGrid + ヘッダー (sort/filter) + フッター (選択数 / 確定ボタン) を組み合わせ
6. `CollectionWidget.svelte` (new): LibraryGrid を `viewMode='grid' itemSize='S'` で表示、空時は「+ アイテム追加」 zero-state
7. `WidgetSettingsDialog.svelte`: collection widget の場合 `<ItemPicker />` を embed
8. Rust: `cmd_delete_item` で `DELETE FROM widget_items WHERE item_id = ?` 追加 (transaction で原子性)
9. E2E: picker open → multi-select → 確定 → widget grid に反映 / item 削除 → widget からも消える

## 規約参照

- engineering-principles §2 (フロント/バック分担: cascade は Rust)
- design_system_architecture.md (LibraryCard 共通化)
- CLAUDE.md「同じ機能には同じアイコン+ラベル」 (Library と picker で同じ表現)

## 参考

- LibraryCard.svelte (再利用元)
- LibraryGrid.svelte (再利用元)
- workspace_repository.rs (widget_items テーブル)
