---
status: todo
phase_id: PH-20260423-167
title: "ItemForm + DropZone ボタン トランジション統一"
scope_files:
  - src/lib/components/arcagate/item/ItemForm.svelte
  - src/lib/components/arcagate/item/DropZone.svelte
parallel_safe: true
depends_on: []
---

## 目的

ItemForm とDropZone のボタン要素にトランジションクラスを追加する。

## 受け入れ条件

| # | 条件                                                                                                                                                                                                  |
| - | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | ItemForm: アイコン選択ボタン（`hover:bg-[var(--ag-surface-4)]`）に `transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` 追加             |
| 2 | ItemForm: alias 削除リンク（`hover:text-red-500`）に同クラス追加                                                                                                                                      |
| 3 | DropZone: 「ファイルを選択」ボタンに `transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97]` 追加 |
| 4 | DropZone: 2つ目のアクションボタンがある場合も同様に追加                                                                                                                                               |

## 実装メモ

- ItemForm は複数フォームセクションにまたがるため Read で全体把握してから編集
