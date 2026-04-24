---
id: PH-20260424-213
title: テーマエディタ MVP
status: in_progress
priority: high
parallel_safe: false
scope_files:
  - src/lib/components/settings/ThemeEditor.svelte
  - src/lib/components/settings/SettingsPanel.svelte
depends_on: []
---

## 目的

Settings > 外観 でカスタムテーマの CSS 変数を直接編集できる UI を提供する。
既存テーマを複製してカスタムテーマを作成し、リアルタイムプレビュー + DB 保存。

## 実装内容

1. `ThemeEditor.svelte`: テーマの `css_vars` JSON を変数ごとに表示
   - `#rrggbb` 形式 → `<input type="color">`
   - その他 → `<input type="text">` + 色プレビュースウォッチ
   - 変更のたびに `el.style.setProperty(key, value)` でリアルタイム反映
   - 「保存」→ `themeStore.updateTheme()`
   - 「削除」→ `themeStore.deleteTheme()` (非組み込みのみ)

2. `SettingsPanel.svelte` 外観タブ:
   - 各テーマボタンに「編集」ボタン追加（カスタムテーマのみ）
   - 「現在のテーマを複製」ボタン → `createTheme()` でクローン作成 → 新テーマが active に
   - ThemeEditor はテーマグリッドの下にインライン展開

## 受け入れ条件

- [ ] カスタムテーマの「編集」ボタンをクリックすると CSS 変数一覧が表示される
- [ ] 変数を変更するとリアルタイムで UI に反映される
- [ ] 「保存」で DB に永続化され、再起動後も反映される
- [ ] 「現在のテーマを複製」でカスタムテーマが作成される
- [ ] 「削除」でカスタムテーマが削除される（組み込みテーマは削除ボタン非表示）
- [ ] `pnpm verify` 全通過
