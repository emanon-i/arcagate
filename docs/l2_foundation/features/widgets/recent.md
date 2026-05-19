# Recent Launches Widget

> widgetType: `recent` / category: library / 配置画面: [Workspace](../screens/workspace.md)

## 目的

最近起動した item を新しい順に最大 N 件表示し、再起動を素早くできる widget。

## やること (必要処理)

- `cmd_get_recent_items` で最近起動順の item list を取得 (widget 初期化時 + max_items 変更時)
- is_enabled=false と per-widget hide 対象を除外
- item click で起動、右クリック context menu

## やらないこと (禁止 / scope 外)

- file system を scan しない
- polling / timer を持たない (起動のたびに再 fetch せず、表示中は config 変更時のみ更新)
- launch_log を widget から書き込まない (起動は backend が記録)
- metadata / icon を widget 自身で IPC 取得しない

## 性能予算

- IPC は初期化と config 変更時の単発のみ。描画は軽量 (max 100 件)

## 副作用 (state 変化 / persistence)

- widget config (`max_items`) を `workspace_widgets.config` JSON に保存
- 読み取り専用 (起動ログは backend 側)

## 依存

- IPC: `cmd_get_recent_items` / `cmd_launch_item`
- DB: `launch_log` / `items`
- config schema: `max_items` (default 10)
- backend: [Item Service](../backend/item-service.md) / [Launcher](../backend/launcher.md)

## 既知の判断

- Settings は共通の `CommonMaxItemsSettings` を使用
