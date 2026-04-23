---
status: todo
phase_id: PH-20260423-171
title: "HotkeyInput + SensitiveControl ボタン polish"
scope_files:
  - src/lib/components/settings/HotkeyInput.svelte
  - src/lib/components/arcagate/library/SensitiveControl.svelte
parallel_safe: true
depends_on: []
---

## 目的

HotkeyInput の「変更」ボタンと SensitiveControl のトグルボタンに
トランジション・focus-visible を追加して操作感を統一する。

## 受け入れ条件

| # | 条件                                                                                                                                                                          |
| - | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | HotkeyInput「変更」ボタン: `transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` 追加           |
| 2 | HotkeyInput「変更」ボタン: `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]` 追加                                   |
| 3 | SensitiveControl ボタン: 裸の `transition-colors` を `transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` に変更 |
| 4 | SensitiveControl ボタン: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]` 追加                                                         |

## 実装メモ

- HotkeyInput はテンプレートリテラルで class を結合しているため、追加クラスを非変動部分に付加すること
