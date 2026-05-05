---
id: PH-20260424-228
title: UI 粗取り（スクロールバー・focus ring・cursor 統一）
status: done
priority: low
parallel_safe: false
scope_files:
  - src/lib/styles/arcagate-theme.css
  - src/lib/components/settings/ThemeEditor.svelte
  - src/lib/components/settings/SettingsPanel.svelte
depends_on: []
---

## 目的

dispatch-log の手動確認依頼の残項目を参照し、コードで対処できるものを消化する。
batch-43 以降の未処理項目：

- ズームスライダーのリアルタイムウィジェットサイズ変更（設定タブ側は既実装。問題なければ確認のみ）
- ThemeEditor スクロールエリアのカスタムスクロールバースタイル統一
- disabled ボタンの opacity-50 統一（一部に不統一あり）

## 実装内容

1. ThemeEditor `.max-h-80` エリアにスクロールバースタイル（`scrollbar-thin`相当）を付与
2. arcagate-theme.css に `--ag-scrollbar-thumb` / `--ag-scrollbar-track` 変数を追加
3. disabled ボタンの状態確認・統一

## 受け入れ条件

- [ ] ThemeEditor のスクロールバーが AG テーマトークン色で表示される
- [ ] disabled ボタンは全て `disabled:opacity-50 disabled:cursor-not-allowed` を持つ
- [ ] `pnpm verify` 全通過
