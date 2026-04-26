---
id: PH-20260427-390
status: todo
batch: 87
type: 改善
era: Polish Era
---

# PH-390: Library / Palette 空状態統合 + EmptyState バリエーション

## 参照した規約

- batch-86 PH-385 で EmptyState 共通コンポーネントを新設、Workspace のみ適用
- 残: Library 既存空状態 (list / grid 2 重複)、Palette 検索 0 件、loading / error variant

## 横展開チェック実施済か

- LibraryMainArea.svelte の hand-rolled 空状態は 2 箇所重複（list/grid 各 1）
- EmptyState を Library 用に拡張し、検索フィルタ空とライブラリ全空を別表示

## 仕様

### Library 空状態統合

`LibraryMainArea.svelte` の 2 重複 hand-rolled empty state を EmptyState に置換:

- 真の空（items.length === 0 && !searchQuery && !activeTag）: icon=Package, title=「ライブラリが空です」, description=「アプリ・フォルダ・URL などのショートカットを追加できます」, action=「アイテムを追加」
- フィルタ結果空（filteredItems.length === 0 だが items は存在）: 短い文言のみ（icon なし、または小さい SearchX icon）

### Palette 検索 0 件

`PaletteSearchResults.svelte`（または該当）で検索結果が 0 のとき:

- icon=SearchX, title=「『{query}』に一致するアイテムはありません」, description=「タグや別の単語で検索するか、Library から登録してください」

### EmptyState バリエーション拡張

`EmptyState.svelte` に variant を追加:

- `default`: 既存（icon + title + description + action）
- `compact`: 小さい表示（フィルタ結果空向け、icon 任意 + 1 行 description）

## 受け入れ条件

- [ ] LibraryMainArea の 2 重複空状態を EmptyState に統合
- [ ] Palette 検索 0 件で EmptyState 表示
- [ ] EmptyState に compact variant 追加
- [ ] e2e: Library 0 件 → 1 件追加 / Palette 検索 0 件 のシナリオ追加
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **F**unction: 0 件 → 1 件遷移の即時 reactivity
- **U**ser expectations: 「0 件で何をすべきか」「検索失敗時の次手」が明示
