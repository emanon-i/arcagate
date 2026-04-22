---
status: done
phase_id: PH-20260422-037
title: arcagate-theme.css 未定義トークン補完（--ag-accent / --ag-border-hover）
depends_on: []
scope_files:
  - src/lib/styles/arcagate-theme.css
parallel_safe: true
---

# PH-20260422-037: arcagate-theme.css 未定義トークン補完

## 目的

コードベース全体で `var(--ag-accent)` と `var(--ag-border-hover)` が参照されているが、
`arcagate-theme.css` に定義が存在しない。CSS 変数が未定義の場合はブラウザが fallback
（空白/transparent）を使用するため、focus-visible リング・ホバーボーダーが表示されない
サイレントバグとなっている。

## 現状（問題）

```css
/* arcagate-theme.css: --ag-accent と --ag-border-hover が未定義 */

/* 使用箇所（src/lib/components/ 内）*/
/* --ag-accent: LibraryCard (focus-visible ring, starred badge bg), LibraryDetailPanel (star button), */
/*              LibraryMainArea (spinner, add button bg), QuickRegisterDropZone, WorkspaceLayout */
/* --ag-border-hover: LibraryCard (hover border) */
```

## 設計判断

- `--ag-accent`: ライトテーマでは cyan-500 `#06b6d4`、ダークテーマでは cyan-400 `#22d3ee`
  （`--ag-accent-text` の色系統と統一、`--ag-accent-border/bg` のベースカラー）
- `--ag-border-hover`: ライトでは `rgba(0,0,0,0.2)`、ダークでは `rgba(255,255,255,0.2)`
  （`--ag-border` の強調版）
- `:root` セクション（ライト）と `.dark` セクション（ダーク）両方に追加

## 実装ステップ

### Step 1: arcagate-theme.css を読んで `:root` / `.dark` の全体構成を確認

### Step 2: `:root` に追加

```css
--ag-accent: #06b6d4;
--ag-border-hover: rgba(0, 0, 0, 0.2);
```

### Step 3: `.dark` に追加

```css
--ag-accent: #22d3ee;
--ag-border-hover: rgba(255, 255, 255, 0.2);
```

### Step 4: pnpm verify

## コミット規約

`fix(PH-20260422-037): arcagate-theme.css に未定義トークン --ag-accent / --ag-border-hover 追加`

## 受け入れ条件

- [x] `pnpm verify` 通過（svelte-check WARNING 0）
- [x] LibraryCard の focus-visible リングが cyan で表示されること
- [x] LibraryCard のホバー時ボーダーが強調されること
- [x] ライト / ダーク両テーマでトークン定義が存在すること

## 停止条件

- arcagate-theme.css に `.dark` セクションが存在しない → `:root` のみ追加して完了
