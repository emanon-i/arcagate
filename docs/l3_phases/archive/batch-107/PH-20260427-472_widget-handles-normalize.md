---
id: PH-20260427-472
title: Widget Move/Resize/Delete ハンドル普通化
status: done
batch: 107
era: polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte
  - src/lib/components/arcagate/workspace/WidgetHandle.svelte (new)
  - src/lib/state/workspace.svelte.ts
  - tests/e2e/workspace-edit-mode.spec.ts (new)
---

# PH-472: Widget Move/Resize/Delete ハンドル普通化

## 背景

ユーザー dev fb (2026-04-27):

> リサイズハンドルと移動のハンドル、普通のアプリで見たことない実装するのやめてね。削除ボタンもださい。普通そう実装しないでしょう。

現状 (`WorkspaceWidgetGrid.svelte:219-305`):

- 常時表示 8 方向 resize handle (`bg-[var(--ag-accent)]/40` 等の独自スタイル)
- `GripVertical` の左上 move handle、右上 `Trash2`
- editMode 関係なくハンドル全表示 → 通常モードでも見えてる
- 各ハンドルの色・サイズ・位置が業界慣習と乖離

## 受け入れ条件

### 機能

- [x] **editMode=true かつ widget 選択中のみ**ハンドルが表示される (`{#if editMode && isSelected}` で WidgetHandles 描画)
- [x] move handle: widget 上端 -top-3 の floating drag bar (普通の DTP / window タイトルバー慣習)
- [x] resize handle: 8 方向 (4 corner + 4 edge)、選択時のみ表示、small square chip (10×10 px) + edge ストリップ、`--ag-accent` 連動
- [x] delete: 右上 -top-3 -right-3 floating × (Lucide `X`)、`bg-[var(--ag-surface)] border` ghost-icon 風、hover で `bg-destructive text-white`
- [x] hover 時カーソルが各方向に変わる (RESIZE_CURSORS 流用、各 handle の inline style)
- [x] 非選択時はハンドル完全非表示、widget content がフル表示
- [x] focus visible: `tabindex={editMode ? 0 : -1}` + `onfocus={() => onSelectedWidgetIdChange(widget.id)}` で keyboard tab → ハンドル表示

### 横展開チェック

- [x] grep: `aria-label="ウィジェットを移動"` `aria-label="ウィジェットを削除"` `RESIZE_LABELS` 参照は WidgetHandles.svelte のみに集約 (旧 WorkspaceWidgetGrid.svelte:219-305 から移行)
- [x] LibraryGrid / Settings 等に同様の resize / drag UI なし (確認済み)
- [x] WorkspaceLayout.svelte の Tip 文言を新仕様に更新 (「クリックで選択、上端のバーで移動、四隅のハンドルでリサイズ、× で削除」)

### SFDIPOT

- **F**unction: 編集モードでのみ操作可能、通常モードはハンドル表示なし
- **D**ata: 既存 `widget.position_x/y/width/height` schema 流用
- **I**nterface: editMode prop / selectedWidgetId state は既存活用
- **P**latform: pointer capture / cursor は既存 PH-331 ロジック流用
- **O**perations: hover 表示 → click 選択 → drag 移動 → drag resize → click × で削除確認

### HICCUPPS

- [Image, User] Figma / Notion / Miro 等の選択 → ハンドル表示パターンに合わせる
- [Comparable] Excel / PowerPoint の選択枠表示
- [Consistency] Library カードの選択視覚と整合

## 実装ステップ

1. `WidgetHandle.svelte` を分離: 移動 / 削除 / 8 方向 resize を 1 コンポーネントに集約
2. `WorkspaceWidgetGrid.svelte` から旧ハンドル削除、`WidgetHandle` を `{#if editMode && selectedWidgetId === widget.id}` で挟む
3. resize handle スタイル: `h-2 w-2 bg-[var(--ag-accent)] border border-[var(--ag-surface)]`、各コーナーに `-translate-x-1/2 -translate-y-1/2`
4. delete button: `absolute -top-3 -right-3` の floating × button、`bg-[var(--ag-surface)] border border-[var(--ag-border)] hover:bg-destructive hover:text-white`
5. move handle: widget header 全体を drag-zone 化 (WidgetShell 側に `data-drag-handle` attr 追加)
6. E2E: editMode off → ハンドル無し / editMode on + 非選択 → ハンドル無し / editMode on + 選択 → 8 ハンドル + × 表示
7. 横展開 grep で他独自ハンドル無し確認

## 規約参照

- `docs/l1_requirements/ux_standards.md` Do/Don't (動きの ease/duration)
- engineering-principles §6 SFDIPOT / HICCUPPS
- CLAUDE.md「アイコン + ラベル」(× は「削除」、GripVertical は「移動」)

## 参考

- WorkspaceWidgetGrid.svelte:219-305 (削除対象の独自ハンドル群)
- pointer-drag.svelte.ts (drag state、流用)
