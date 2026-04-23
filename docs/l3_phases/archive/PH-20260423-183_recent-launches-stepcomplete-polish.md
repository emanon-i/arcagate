---
status: done
phase_id: PH-20260423-183
title: RecentLaunchesWidget + StepComplete focus-visible / active:scale 追加
category: 改善
scope_files:
  - src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte
  - src/lib/components/setup/StepComplete.svelte
parallel_safe: true
depends_on: []
---

## 目的

RecentLaunchesWidget のアイテムボタンと StepComplete の「始める」ボタンに focus-visible + active:scale を追加。StepComplete はデザイントークン参照に統一。

## 変更内容

### RecentLaunchesWidget.svelte（アイテムボタン）

追加クラス:

```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

`ease-[var(--ag-ease-in-out)]` も追加（現在 `duration` だけあり `ease` が欠落）。

### StepComplete.svelte（始めるボタン）

現在 Tailwind design tokens（`bg-primary`, `text-primary-foreground`）を使用。
デザイントークン参照に揃えつつ focus-visible + active:scale を追加:

```
rounded-md bg-[var(--ag-accent)] px-4 py-2 text-sm font-medium text-white
transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)]
motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2
focus-visible:ring-[var(--ag-accent)] hover:opacity-90
```

## 検証

- `pnpm verify` グリーン
