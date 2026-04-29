---
id: PH-20260424-231
title: app.css 残 shadcn トークン ag-* bridge 完成
status: done
priority: medium
parallel_safe: false
scope_files:
  - src/app.css
depends_on: []
---

## 目的

`src/app.css` に残っている shadcn-only トークン（--card, --popover, --secondary, --accent）を
ag-* 変数にブリッジし、DropdownMenu / Button がテーマ切替に追従するようにする。

`--primary` は accent 色との輝度差でアクセシビリティ問題があるため対象外とし、
現状の明示的な色指定を維持する。

## 実装内容

1. `:root {}` ブロックの `/* shadcn-only tokens */` セクションを ag-* bridge に変更:
   - `--card` → `var(--ag-surface-0)`
   - `--card-foreground` → `var(--ag-text-primary)`
   - `--popover` → `var(--ag-surface-1)`
   - `--popover-foreground` → `var(--ag-text-primary)`
   - `--secondary` → `var(--ag-surface-2)`
   - `--secondary-foreground` → `var(--ag-text-primary)`
   - `--accent` (shadcn hover state) → `var(--ag-surface-3)`
   - `--accent-foreground` → `var(--ag-text-primary)`
   - `--primary` / `--primary-foreground` / `--destructive` → 変更なし

2. `.dark {}` ブロックを削除
   - ag-* 変数が arcagate-theme.css の `.dark {}` ブロックで自動切替されるため
   - `--background` などの ag-* bridge は `:root` の一箇所で十分

## 受け入れ条件

- [ ] DropdownMenu の背景が dark/light テーマ切替で追従すること
- [ ] Button outline の hover 背景がテーマ変数色を使うこと
- [ ] `pnpm verify` 全通過
