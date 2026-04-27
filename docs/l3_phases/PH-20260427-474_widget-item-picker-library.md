---
id: PH-20260427-474
title: Widget Item Picker = LibraryCard 再利用 + 複数選択 + Collection Widget
status: todo
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
- [ ] **CollectionWidget**: 新 widget type、複数 item id を config に保持、LibraryCard を `itemSize='S'` で grid 表示
- [ ] **ItemPicker** モーダル: LibraryGrid を `mode='picker'` で埋め込み、各カード click でトグル選択、選択数バッジ + 「N 件追加」ボタン
- [ ] **ソート / フィルタ**: Picker 内で既存 LibraryGrid の sort (name / created / used) + filter (tag / type) を使える
- [ ] **複数選択**: Cmd/Ctrl+click 個別、Shift+click 範囲、checkbox overlay
- [ ] **既存 ItemWidget**: collection への置換 path を提供 (settings dialog で「複数 item に変更」ボタン → CollectionWidget に migrate)
- [ ] **Library 削除 ↔ widget 同期**: `cmd_delete_item` 内で widget_items の参照を一括削除 (Rust service 層で transaction)
- [ ] dead reference テスト: item 削除 → widget が画面に残ったまま空表示にならず、参照が消えるだけ

### 横展開チェック
- [ ] LibraryCard の props を `mode?: 'normal'|'picker'` `selected?: boolean` で拡張、既存利用箇所影響なし
- [ ] Library フィルタ / ソート state は store 化されているか、picker でも同じ store 使えるか確認

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
