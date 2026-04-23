---
status: todo
phase_id: PH-20260423-175
title: "裸の transition-colors 残留箇所 CSS 変数化（整理）"
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceView.svelte
  - src/lib/components/arcagate/palette/PaletteResultRow.svelte
  - src/lib/components/arcagate/common/SidebarRow.svelte
parallel_safe: true
depends_on: []
---

## 目的

`transition-colors` のみで `duration-` / `ease-` / `motion-reduce:transition-none` が付いていない
残留箇所を `duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` に統一する。

## 受け入れ条件

| # | 条件                                                                                                            |
| - | --------------------------------------------------------------------------------------------------------------- |
| 1 | 調査対象ファイルを Read して `transition-colors` のみのクラスを特定する                                         |
| 2 | 各箇所に `duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` を追加 |
| 3 | `pnpm verify` が通ること                                                                                        |

## 実装メモ

- `grep -r "transition-colors" src/lib/components --include="*.svelte"` で一覧を出してから対象を絞る
- PaletteResultRow / SidebarRow は batch-33 で対応済みの可能性があるため、Read で確認してから判断
- 未対応ファイルが見つかった場合のみ修正する。見つからなければ「修正不要・done」として処理
