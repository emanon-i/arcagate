---
id: PH-20260424-214
title: テーマ JSON インポート/エクスポート UI
status: in_progress
priority: medium
parallel_safe: false
scope_files:
  - src/lib/components/settings/SettingsPanel.svelte
depends_on: [PH-20260424-213]
---

## 目的

バックエンドに既存の `export_theme_json` / `import_theme_json` IPC コマンドに対する
UI を Settings > 外観 に追加する。

## 実装内容

1. **エクスポート**: 選択中カスタムテーマの「エクスポート」ボタン
   - `themeStore.exportTheme(id)` → JSON 文字列をクリップボードコピー
   - コピー完了トースト表示

2. **インポート**: テーマグリッド下部に「JSON からインポート」ボタン
   - クリックで textarea モーダル展開
   - JSON 貼り付け → `themeStore.importTheme(json)` → テーマ一覧に追加

## 受け入れ条件

- [ ] エクスポートボタンクリックでクリップボードに JSON がコピーされる
- [ ] インポート textarea に有効 JSON を貼り付けると新テーマが作成される
- [ ] 重複名・不正 JSON のエラーが UI に表示される
- [ ] `pnpm verify` 全通過
