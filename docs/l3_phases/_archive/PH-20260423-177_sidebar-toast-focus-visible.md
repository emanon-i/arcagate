---
status: wip
phase_id: PH-20260423-177
title: SidebarRow + ToastContainer focus-visible 追加
category: 改善
scope_files:
  - src/lib/components/arcagate/common/SidebarRow.svelte
  - src/lib/components/arcagate/common/ToastContainer.svelte
parallel_safe: true
depends_on: []
---

## 目的

SidebarRow（iconOnly/full 両モード）と ToastContainer の dismiss ボタンに focus-visible スタイルを追加する。

## 変更内容

### SidebarRow.svelte（2箇所）

iconOnly ボタンと full ボタンそれぞれのクラス末尾に追加:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

### ToastContainer.svelte（1箇所）

dismiss ボタンに追加:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

## 検証

- `pnpm verify` グリーン
- 手動確認: Tab でサイドバー・トーストボタンにフォーカスするとリング表示
