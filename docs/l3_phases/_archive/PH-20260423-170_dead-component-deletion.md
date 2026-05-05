---
status: todo
phase_id: PH-20260423-170
title: "デッドコンポーネント削除（6 ファイル）"
scope_files:
  - src/lib/components/palette/CommandPalette.svelte
  - src/lib/components/palette/ResultList.svelte
  - src/lib/components/palette/ResultItem.svelte
  - src/lib/components/settings/WatchedPathsManager.svelte
  - src/lib/components/item/ItemList.svelte
  - src/lib/components/item/TagManager.svelte
parallel_safe: false
depends_on: []
---

## 目的

外部から import されていない死んだコンポーネント 6 ファイルを削除してバンドルサイズを削減し、
コードベースの見通しを改善する。

## 受け入れ条件

| # | 条件                                                          |
| - | ------------------------------------------------------------- |
| 1 | 6 ファイルを削除前に `grep -r` でインポートがないことを再確認 |
| 2 | 6 ファイルを削除                                              |
| 3 | `pnpm verify` が通ること（svelte-check でエラーなし）         |

## 実装メモ

- `CommandPalette` は PaletteOverlay に置換済み
- `WatchedPathsManager` はウィジェット設定で置換済み
- `ItemList` / `TagManager` は現行 UI で直接描画に置換済み
- 削除後に svelte-check を走らせて参照漏れがないことを確認すること
