---
status: done
phase_id: PH-20260423-163
scope_files:
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-163 LibraryDetailPanel / LibraryMainArea ボタン polish

## 背景・目的

Library パネルの複数ボタンが `hover:bg` を持つが `transition` が一切ない。
詳細パネルは毎日操作する中心的 UI であり、インタラクション品質が低い。

### LibraryDetailPanel.svelte 対象ボタン

| 行   | 用途              | 現在                                            |
| ---- | ----------------- | ----------------------------------------------- |
| ~200 | 編集/操作アイコン | `hover:bg-[var(--ag-surface-3)]`                |
| ~235 | タグ削除          | `hover:bg-[var(--ag-surface-4)] hover:text-...` |
| ~252 | タグ追加          | `hover:bg-[var(--ag-surface-3)]`                |
| ~262 | タグ候補選択      | `hover:bg-[var(--ag-surface-3)]`                |
| ~290 | アクション実行    | `hover:bg-[var(--ag-surface-4)]`                |
| ~317 | 削除ボタン        | `hover:bg-destructive/20`                       |

### LibraryMainArea.svelte 対象ボタン

| 行   | 用途             | 現在                             |
| ---- | ---------------- | -------------------------------- |
| ~125 | タグ削除         | `hover:bg-[var(--ag-surface-4)]` |
| ~135 | アイテム追加     | `hover:bg-[var(--ag-surface-4)]` |
| ~184 | アクセントボタン | `hover:opacity-90`               |

## 実装仕様

共通: 各 `class` に `transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` を追加する。

`active:scale` はアイコン小ボタン（タグ削除など）に `active:scale-[0.95]`、
大きなアクションボタン（アイテム追加・アクセント系）に `active:scale-[0.97]` を追加する。

削除ボタン（destructive）には `transition-[background-color,transform]` + `active:scale-[0.97]`。

アクセントボタン（`hover:opacity-90`）は `transition-opacity` に変更し `motion-reduce:transition-none` を追加。

## 受け入れ条件

- [ ] LibraryDetailPanel 内の全 `hover:` ボタンに transition が付いている
- [ ] LibraryMainArea 内の全 `hover:` ボタンに transition が付いている
- [ ] 削除ボタン: クリック時に scale プレス感
- [ ] `motion-reduce:transition-none` 全追加
- [ ] `pnpm verify` 全通過
