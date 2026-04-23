---
id: PH-20260424-205
title: 組み込みテーマプリセット追加（Endfield・Ubuntu Frosted）
status: wip
priority: high
parallel_safe: false
scope_files:
  - src-tauri/migrations/011_builtin_theme_presets.sql
  - src-tauri/src/db/migrations.rs
  - src-tauri/src/repositories/theme_repository.rs
  - src-tauri/src/services/theme_service.rs
  - src/lib/components/settings/SettingsPanel.svelte
---

## 背景

ユーザ指示（2026-04-23）: Endfield 風（Arknights/SF 系）と Ubuntu Frosted（Orange+aubergine）の
2 プリセットテーマを組み込みで同梱。Settings Appearance から選択可能にする。

## 変更内容

### DB マイグレーション 011

- `INSERT OR IGNORE INTO themes` で 2 テーマをシード（べき等）
- `theme-builtin-endfield`: ネイビー背景 + シアンアクセント（Arknights Endfield 風）
- `theme-builtin-ubuntu-frosted`: aubergine 背景 + Ubuntu オレンジアクセント

### SettingsPanel 外観セクション更新

- 旧: ダーク/ライト 2 ボタン
- 新: 2×N グリッドのテーマカード（フラット Dark/Light + DB テーマ全件）
- 各カードに名前 + 種別（デフォルト/組み込み/カスタム）

## 受け入れ条件

- Settings > 外観 に Endfield / Ubuntu Frosted カードが表示される
- カードをクリックするとテーマが適用される（ページリロード後も維持）
- カスタムテーマも同グリッドに表示される
