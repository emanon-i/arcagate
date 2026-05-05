---
status: todo
phase_id: PH-20260423-166
title: "ダイアログアクションボタン トランジション統一"
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceDeleteConfirmDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceRenameDialog.svelte
parallel_safe: true
depends_on: []
---

## 目的

WorkspaceDeleteConfirmDialog と WorkspaceRenameDialog のアクションボタンに
トランジションクラスを追加し、他のボタンと統一する。

## 受け入れ条件

| # | 条件                                                                                                                                                                                                     |
| - | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | DeleteConfirmDialog: キャンセルボタンに `transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` を追加                                         |
| 2 | DeleteConfirmDialog: 削除確定ボタンに `transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97]` を追加 |
| 3 | RenameDialog: キャンセルボタンに同じ transition-colors クラスを追加                                                                                                                                      |
| 4 | RenameDialog: 保存ボタンに `transition-[background-color,transform] ... active:scale-[0.97]` を追加                                                                                                      |

## 実装メモ

- 既存の `hover:` クラスはそのまま維持
- `motion-reduce:transition-none` で `prefers-reduced-motion` を尊重
