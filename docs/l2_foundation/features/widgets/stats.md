# Stats Widget

> widgetType: `stats` / category: info / 配置画面: [Workspace](../screens/workspace.md)

## 目的

起動回数が多い item を上位 N 件、降順で表示する起動統計 widget。

## やること (必要処理)

- `cmd_get_frequent_items` で起動頻度の高い item list を取得 (widget 初期化時 + max_items 変更時)
- per-widget hide 対象を除外
- item click で起動

## やらないこと (禁止 / scope 外)

- file system を scan しない
- polling / timer を持たない
- 統計の集計を widget でしない (backend の SQL GROUP BY に委譲)
- frecency (recency 加味) ではなく pure frequency のみ表示する

## 性能予算

- IPC は初期化と config 変更時の単発のみ。集計は DB 側

## 副作用 (state 変化 / persistence)

- widget config (`max_items`) を `workspace_widgets.config` JSON に保存
- 読み取り専用

## 依存

- IPC: `cmd_get_frequent_items` / `cmd_launch_item`
- DB: `launch_log` / `items`
- config schema: `max_items` (default 10)
- backend: [Item Service](../backend/item-service.md) / [Launcher](../backend/launcher.md)

## 既知の判断

- Settings は共通の `CommonMaxItemsSettings` を使用
