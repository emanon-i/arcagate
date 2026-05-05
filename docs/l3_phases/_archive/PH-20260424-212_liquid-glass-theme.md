---
id: PH-20260424-212
title: Liquid Glass 組み込みテーマプリセット実装
status: done
priority: high
parallel_safe: false
scope_files:
  - src-tauri/migrations/012_liquid_glass_theme.sql
  - src-tauri/src/db/migrations.rs
  - src-tauri/src/repositories/theme_repository.rs
  - src-tauri/src/services/theme_service.rs
  - src/lib/state/theme.svelte.ts
  - src/lib/styles/arcagate-theme.css
depends_on: []
---

## 目的

ユーザ要望（2026-04-24）: Apple 系 UI 言語に寄せた「Liquid Glass 風」テーマを
組み込みプリセットとして追加する。

Endfield・Ubuntu Frosted に続く 3 本目の組み込みカスタムテーマ。

## 技術方針

- CSS 変数のみの変更では `backdrop-filter` を適用できないため、
  `applyTheme()` に `data-theme` 属性の設定を追加
- `arcagate-theme.css` の `[data-theme="theme-builtin-liquid-glass"]` セレクタで
  構造的要素に `backdrop-filter: var(--ag-backdrop)` を適用
- `--ag-backdrop: none` をデフォルト値として `:root` に追加（既存テーマへの影響なし）

## 実装内容

1. `012_liquid_glass_theme.sql`: Liquid Glass テーマの CSS 変数定義（INSERT OR IGNORE）
2. `migrations.rs`: MIGRATION_012 を追加
3. `theme.svelte.ts`: `applyTheme()` で `el.dataset.theme = activeMode` を設定
4. `arcagate-theme.css`: `--ag-backdrop: none` + `[data-theme=...]` グローバル CSS
5. テスト更新: builtin 数 4→5

## 受け入れ条件

- [x] Settings > 外観 に「Liquid Glass」ボタンが表示される
- [x] Liquid Glass 選択後、`<html data-theme="theme-builtin-liquid-glass">` が設定される
- [x] カード・ダイアログに backdrop-filter が適用される（ガラス質感）
- [x] `pnpm verify` 全通過
