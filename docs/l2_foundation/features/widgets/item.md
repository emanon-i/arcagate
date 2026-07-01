# Item Widget

> widgetType: `item` / category: library / 配置画面: [Workspace](../screens/workspace.md)

## 目的

Library から選んだ item を pin して 1 widget に集めるコレクション widget。grid / list の切替と並び替えで、シナリオ別の quick launch tile を作る。

## やること (必要処理)

- `item_ids[]` で指定した Library item を grid または list で表示
- view_mode (grid / list) の切替。grid は container query で widget 幅に応じ 2/3/4 列に動的調整
- sort_field (manual / name)。manual 時は ↑↓ で並び替え
- item click で起動 (cascade resolve: item default → widget default → system)、右クリック context menu
- Settings dialog で item picker (add / remove / clear all)、並び替え、default opener 選択

## やらないこと (禁止 / scope 外)

- file system を scan しない (Library 登録済 item の表示のみ)
- item の metadata / icon を widget 自身で IPC 取得しない (itemStore の cache を read)
- 単一 widget で polling / timer を持たない
- Library 未登録の path を直接起動しない (登録 item 経由)

## 性能予算

- 描画は itemStore の reactive read のみ。IPC は起動操作時の単発
- main thread を block しない (heavy 処理なし)

## 副作用 (state 変化 / persistence)

- widget config (`item_ids` / `view_mode` / `sort_field` / `default_opener_id`) を `workspace_widgets.config` JSON に保存

## 依存

- IPC: `cmd_launch_item` (cascade)
- DB: `items` (itemStore 経由で read)
- config schema: `item_ids: string[]` / `view_mode: 'grid' | 'list'` (default grid) / `sort_field: 'manual' | 'name'` (default manual) / `default_opener_id`
- backend: [Launcher](../backend/launcher.md)

## 既知の判断

- item 参照は `item_ids[]` (複数対応) で保持する
