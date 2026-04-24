---
id: PH-20260424-215
title: Liquid Glass コントラスト確認・polish
status: done
priority: low
parallel_safe: false
scope_files:
  - src-tauri/migrations/012_liquid_glass_theme.sql
  - src/lib/styles/arcagate-theme.css
depends_on: []
---

## 目的

Liquid Glass テーマ選択時のテキスト可読性・コントラスト比を確認し、
必要であれば CSS 変数を調整する。

## 確認項目

- `--ag-text-primary` (rgba(255,255,255,0.92)) on `--ag-surface-0` (rgba(255,255,255,0.03)) のコントラスト
- アクセントカラー `#3b82f6` の視認性
- カード hover 時の backdrop-filter 効果確認

## 実装内容

- 必要に応じて `012_liquid_glass_theme.sql` の CSS 変数を調整（DB migration は OR IGNORE なので
  既存インストール向けには Rust コードで上書き update が必要な場合がある）
- `arcagate-theme.css` の `[data-theme]` セレクタ側の追加 polish

## 受け入れ条件

- [ ] Liquid Glass テーマでのテキスト可読性が十分（肉眼確認）
- [ ] `pnpm verify` 全通過
