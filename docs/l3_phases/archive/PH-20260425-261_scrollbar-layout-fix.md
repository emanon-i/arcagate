---
id: PH-20260425-261
status: done
batch: 61
type: 改善
---

# PH-261: スクロールバー被り修正 + テキスト truncate 統一

## 背景・目的

実機フィードバック: スクロールバーがアイテムと重なる UI バグ。
あわせてテキスト truncate ルールを統一する。

## 調査箇所

- `LibraryMainArea.svelte`: アイテムリストのスクロールコンテナ
- `WorkspaceWidgetGrid.svelte`: ウィジェットグリッドのスクロール
- ウィジェット内アイテムリスト

## 修正方針

- `overflow-y: auto` + `padding-right` でスクロールバー領域を確保
- または `scrollbar-gutter: stable` を適用

## テキスト truncate ルール

- 1行最大: `truncate` (text-overflow: ellipsis)
- 2行最大: `line-clamp-2`
- ux_standards.md に記録

## 受け入れ条件

- [ ] スクロールバーがアイテムと重ならない
- [ ] truncate ルールが `ux_standards.md` に記録される
- [ ] `pnpm verify` 全通過
