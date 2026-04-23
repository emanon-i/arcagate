---
status: wip
phase_id: PH-20260423-176
title: TitleBar ウィンドウコントロールボタン focus-visible 追加
category: 改善
scope_files:
  - src/lib/components/arcagate/common/TitleBar.svelte
parallel_safe: true
depends_on: []
---

## 目的

TitleBar の minimize / maximize / close ボタン（3件）に `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]` を追加し、キーボードフォーカス時にリングが見えるようにする。

## 変更内容

`src/lib/components/arcagate/common/TitleBar.svelte`

3つのボタンすべてに統一パターンを追加:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

close ボタンはリング色も `focus-visible:ring-red-500/70` に変えることを検討するが、統一性のためにアクセントカラーで統一する。

## 検証

- `pnpm verify` グリーン
- 手動確認: Tab キーで TitleBar ボタンにフォーカスするとリングが見えること
