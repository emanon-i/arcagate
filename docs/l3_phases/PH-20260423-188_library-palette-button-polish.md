---
status: done
phase_id: PH-20260423-188
title: LibraryMainArea + PaletteSearchBar ボタン active:scale / focus-visible 追加
category: 改善
scope_files:
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
  - src/lib/components/arcagate/palette/PaletteSearchBar.svelte
parallel_safe: true
depends_on: []
---

## 目的

LibraryMainArea のアクションボタン群と PaletteSearchBar クリアボタンに active:scale / focus-visible が未設定。

## 対象ボタン

### LibraryMainArea.svelte

- 「アイテム追加」ボタン
- タグフィルターボタン
- 表示モード切替ボタン

各ボタンに追加:

```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

### PaletteSearchBar.svelte

- 検索クリア（×）ボタンに追加（同上）。

## 検証

- `pnpm biome check` でエラーなし
- svelte-check でエラーなし
