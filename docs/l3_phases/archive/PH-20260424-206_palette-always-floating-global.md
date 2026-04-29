---
id: PH-20260424-206
title: パレット常時フローティング化・グローバルホットキー修正
status: wip
priority: critical
parallel_safe: false
scope_files:
  - src-tauri/src/lib.rs
  - src/routes/+page.svelte
---

## 背景

ユーザ実機確認（2026-04-24）: 「Ctrl+Shift+Space のパレット起動、Arcagate ウィンドウが
アクティブでないと起動しない」

根本原因: ホットキーハンドラが `main_visible` で分岐し、main window が表示中の場合は
インラインパレット（`hotkey-triggered` イベント）へ飛ばす設計。main が可視でも非フォーカスの
場合、ユーザは palette を見られない。

ユーザの期待: 常にフローティングパレットウィンドウで起動（Raycast / Alfred 風）。

## 変更内容

### src-tauri/src/lib.rs

- ホットキーハンドラから `main_visible` 分岐を削除
- 常に `palette` ウィンドウの show/hide をトグル

### src/routes/+page.svelte

- `hotkey-triggered` リスナー削除
- `paletteOpen` state 削除
- インライン `PaletteOverlay` コンポーネント削除
- Search ボタンを `openFloatingPalette()` に変更（`WebviewWindow.getByLabel` 経由）

## 受け入れ条件

- Arcagate ウィンドウが最小化・非アクティブ状態でも Ctrl+Shift+Space でパレットが開く
- 他のアプリがフォアグラウンドの状態でも Ctrl+Shift+Space が機能する
- タイトルバーの Search ボタンでもフローティングパレットが開く
- パレット起動 → 検索 → Enter → アイテム実行の全操作が完結する
