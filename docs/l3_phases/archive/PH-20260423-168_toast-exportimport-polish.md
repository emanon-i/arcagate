---
status: todo
phase_id: PH-20260423-168
title: "ToastContainer + ExportImport ボタン polish"
scope_files:
  - src/lib/components/arcagate/common/ToastContainer.svelte
  - src/lib/components/arcagate/settings/ExportImport.svelte
parallel_safe: true
depends_on: []
---

## 目的

ToastContainer の閉じるボタンと ExportImport のボタンにトランジションを追加する。

## 受け入れ条件

| # | 条件                                                                                                                                                                                                |
| - | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | ToastContainer: 閉じるボタンに `transition-[color,background-color,opacity] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` を追加                   |
| 2 | ExportImport: エクスポートボタンに `transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97]` 追加 |
| 3 | ExportImport: インポートボタン（ある場合）も同様に追加                                                                                                                                              |

## 実装メモ

- ExportImport は `bg-primary` など shadcn トークンを使っている可能性あり。ag-* への変換は行わない（スコープ外）
