---
id: PH-20260422-105
title: app.css 未使用 shadcn トークン除去
status: todo
batch: 23
priority: low
created: 2026-04-22
scope_files:
  - src/app.css
parallel_safe: true
depends_on: []
---

## 背景/目的

`src/app.css` に shadcn-svelte scaffold が生成した CSS カスタムプロパティのうち、
Arcagate コードベース（`src/lib/components/ui/` 外）で一切参照されていないトークンが残存している。

調査済み未使用トークン:

- `--chart-1` 〜 `--chart-5`（グラフ系 — AG はグラフ機能なし）
- `--sidebar-*` 系 8 件（shadcn Sidebar コンポーネント用 — AG は独自サイドバー実装）

これらは `:root` / `.dark` / `@theme inline` の 3 箇所に散在しており、
ファイルサイズの無駄かつ二重管理の誤解を招く。

## 実装内容

`src/app.css` から以下を削除:

### `:root` ブロック

```css
/* 削除 */
--chart-1: oklch(0.646 0.222 41.116);
--chart-2: oklch(0.6 0.118 184.704);
--chart-3: oklch(0.398 0.07 227.392);
--chart-4: oklch(0.828 0.189 84.429);
--chart-5: oklch(0.769 0.188 70.08);
--sidebar: oklch(0.985 0 0);
--sidebar-foreground: oklch(0.145 0 0);
--sidebar-primary: oklch(0.205 0 0);
--sidebar-primary-foreground: oklch(0.985 0 0);
--sidebar-accent: oklch(0.97 0 0);
--sidebar-accent-foreground: oklch(0.205 0 0);
--sidebar-border: oklch(0.922 0 0);
--sidebar-ring: oklch(0.708 0 0);
```

`.dark` ブロックも同様に削除。

### `@theme inline` ブロック

```css
/* 削除 */
--color-chart-1: var(--chart-1);
--color-chart-2: var(--chart-2);
--color-chart-3: var(--chart-3);
--color-chart-4: var(--chart-4);
--color-chart-5: var(--chart-5);
--color-sidebar: var(--sidebar);
--color-sidebar-foreground: var(--sidebar-foreground);
--color-sidebar-primary: var(--sidebar-primary);
--color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
--color-sidebar-accent: var(--sidebar-accent);
--color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
--color-sidebar-border: var(--sidebar-border);
--color-sidebar-ring: var(--sidebar-ring);
```

## 受け入れ条件

- [ ] `pnpm check`（svelte-check）で 0 errors / 0 warnings
- [ ] `pnpm verify` 全通過（tauri build 含む）
- [ ] 削除後も UI 外観に変化がないこと（ライト/ダーク両方で目視確認）
- [ ] `grep -r "chart-\|sidebar-" src/ --include="*.svelte" --include="*.ts"` で `src/lib/components/ui/` 外のヒットがないこと
