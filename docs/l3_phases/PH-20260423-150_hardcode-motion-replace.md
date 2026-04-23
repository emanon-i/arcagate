---
status: wip
phase_id: PH-20260423-150
title: "ハードコード transition 値 → CSS 変数置換 + motion-reduce 適用"
depends_on: [PH-20260423-147]
scope_files:
  - src/lib/components/arcagate/common/WidgetShell.svelte
  - src/lib/components/arcagate/workspace/FavoritesWidget.svelte
  - src/lib/components/arcagate/workspace/ProjectsWidget.svelte
  - src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte
  - src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte
parallel_safe: false
---

# PH-20260423-150: ハードコード transition 値置換

## 目的

PH-147 で追加した `--ag-duration-*` / `--ag-ease-*` / `--ag-shadow-*` を
既存コンポーネントのハードコード値に適用し、デザインシステムの一貫性を確立する。

## 対象ハードコード一覧

| ファイル                    | 現行                                            | 置換後                                                                |
| --------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| WidgetShell.svelte          | `duration-150`                                  | `duration-[var(--ag-duration-fast)]`                                  |
| WidgetShell.svelte          | `shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]` | `shadow-[var(--ag-shadow-sm)]` に整理（inset は追加の装飾なので残す） |
| FavoritesWidget.svelte      | `duration-100`                                  | `duration-[var(--ag-duration-fast)]`                                  |
| ProjectsWidget.svelte       | `duration-100`                                  | `duration-[var(--ag-duration-fast)]`                                  |
| RecentLaunchesWidget.svelte | `duration-100`                                  | `duration-[var(--ag-duration-fast)]`                                  |
| WorkspaceSidebar.svelte     | `transition: width 150ms ease`                  | `transition: width var(--ag-duration-fast) var(--ag-ease-in-out)`     |

## 実装ステップ

### Step 1: Tailwind duration 値を CSS 変数参照に置換

各コンポーネントの `duration-100` / `duration-150` を
`duration-[var(--ag-duration-fast)]` に置換する。

Tailwind v4 では `duration-[<value>]` で CSS 変数を参照できる。

### Step 2: WorkspaceSidebar のインラインスタイル修正

```svelte
<!-- Before -->
style="width: {editMode ? '200px' : '48px'}; transition: width 150ms ease;"
<!-- After -->
style="width: {editMode ? '200px' : '48px'}; transition: width var(--ag-duration-fast) var(--ag-ease-in-out);"
```

### Step 3: motion-reduce クラス追加

各トランジション要素に `motion-reduce:transition-none` を追加（Tailwind のユーティリティ）。

CSS 変数で `--ag-duration-*: 0ms` になることで実質的に同じ効果があるが、
`motion-reduce:transition-none` を明示することで意図を文書化する。

### Step 4: pnpm verify

`pnpm verify` で全通過を確認。

## 受け入れ条件

- [ ] `duration-100` / `duration-150` のハードコードが CSS 変数参照に置き換わっている
- [ ] WorkspaceSidebar の `transition: width 150ms ease` が CSS 変数を参照している
- [ ] 各コンポーネントに `motion-reduce:transition-none` が追加されている
- [ ] `pnpm verify` 全通過
