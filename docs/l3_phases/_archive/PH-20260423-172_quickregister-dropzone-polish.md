---
status: todo
phase_id: PH-20260423-172
title: "QuickRegisterDropZone transition 標準化"
scope_files:
  - src/lib/components/arcagate/library/QuickRegisterDropZone.svelte
parallel_safe: true
depends_on: []
---

## 目的

QuickRegisterDropZone の `transition-colors` を CSS 変数 duration/ease 付きに標準化し、
focus-visible ring を追加する。

## 受け入れ条件

| # | 条件                                                                                                                                                                     |
| - | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | `transition-colors` を `transition-[border-color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` に変更 |
| 2 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]` 追加                                                                             |

## 実装メモ

- `isDragging` による動的 class と静的 class が結合されているため、静的クラス部分に追加すること
