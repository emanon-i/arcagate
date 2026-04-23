---
status: todo
phase_id: PH-20260423-173
title: "ItemForm タイプトグルボタン transition 標準化"
scope_files:
  - src/lib/components/item/ItemForm.svelte
parallel_safe: true
depends_on: []
---

## 目的

ItemForm のタイプ切り替えトグル（ローカル/URL）ボタンに裸の `transition-colors` が残っている。
CSS 変数 duration/ease + motion-reduce に統一する。

## 受け入れ条件

| # | 条件                                                                                                                                                               |
| - | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | 「ローカル」ボタン: `transition-colors` → `transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` に変更 |
| 2 | 「URL」ボタン: 同上                                                                                                                                                |
| 3 | 両ボタンに `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]` 追加                                                            |

## 実装メモ

- テンプレートリテラルで active/inactive クラスを結合しているため、固定部分に追加すること
