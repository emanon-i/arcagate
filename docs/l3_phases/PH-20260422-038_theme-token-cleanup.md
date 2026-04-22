---
status: todo
phase_id: PH-20260422-038
title: arcagate-theme.css ラジアス整理（--ag-radius-input 追加 + Radii コメント統一）
depends_on:
  - PH-20260422-037
scope_files:
  - src/lib/styles/arcagate-theme.css
parallel_safe: false
---

# PH-20260422-038: arcagate-theme.css ラジアス整理

## 目的

PH-20260422-037 で `--ag-accent` / `--ag-border-hover` を補完したが、
`--ag-radius-input` も未定義のまま多数のフォーム要素で参照されている。
このトークンを追加してフォーム要素の角丸を統一する。
また、`:root` の Radii セクションにラジアス関連トークンが分散しているため整理する。

## 現状

```css
/* arcagate-theme.css: --ag-radius-input が未定義 */
/* 使用箇所: ItemForm.svelte（4箇所）、WidgetSettingsDialog.svelte（5箇所）、WorkspaceLayout.svelte（1箇所） */
/* 現在の Radii セクション（--ag-radius-input が欠落）*/
--ag-radius-chip: 9999px;
--ag-radius-button: 1rem;
--ag-radius-card: 22px;
...
```

## 設計判断

- `--ag-radius-input: 0.5rem`（8px）: フォーム入力の標準角丸。`--ag-radius-button` (1rem) より小さく
- `.dark` には Radii の定義がないため `:root` のみ追加（テーマ共通）
- コメント「Radii」セクションに統一して並べる

## 実装ステップ

### Step 1: arcagate-theme.css の Radii セクションに追加

```css
/* Radii */
--ag-radius-chip: 9999px;
--ag-radius-button: 1rem;
--ag-radius-input: 0.5rem;   /* ← 追加 */
--ag-radius-card: 22px;
...
```

### Step 2: pnpm verify

## コミット規約

`fix(PH-20260422-038): arcagate-theme.css に --ag-radius-input トークン追加`

## 受け入れ条件

- [ ] `pnpm verify` 通過（svelte-check WARNING 0）
- [ ] ItemForm の入力フィールドに 8px の角丸が適用されること
- [ ] WidgetSettingsDialog の入力フィールドも同様に角丸が適用されること

## 停止条件

- `--ag-radius-input` が既に定義されていた → 定義値を確認して完了とする
