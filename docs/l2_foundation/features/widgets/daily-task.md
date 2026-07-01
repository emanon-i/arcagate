# Daily Task Widget (デイリータスク)

> widgetType: `daily_task` / category: memo / 配置画面: [Workspace](../screens/workspace.md)

## 目的

その日のタスクを管理するチェックリスト widget。未完了 / 完了の 2 セクションで進捗を見せる。

## やること (必要処理)

- タスクの追加 (text + UUID)、完了 toggle、削除
- 未完了 / 完了の 2 セクション表示。完了セクションは default 折りたたみ
- Settings で `hideCompleted` flag と title を変更

## やらないこと (禁止 / scope 外)

- file system / DB テーブルに書かない (config JSON にのみ保存)
- 日付管理 / リマインダ / 通知をしない (単純チェックリスト)
- タスクの自動リセットをしない (「デイリー」は用途名で、日次自動クリアはない)
- polling / IPC を持たない (起動操作なし)

## 性能予算

- 純 in-memory + config 保存のみ。heavy 処理なし

## 副作用 (state 変化 / persistence)

- widget config (`tasks[]` / `hideCompleted` / `title`) を `workspace_widgets.config` JSON に保存

## 依存

- IPC: `cmd_update_widget_config` のみ
- config schema: `tasks: { id, text, done }[]` / `hideCompleted?: boolean` / `title?: string`
- backend: [Workspace Service](../backend/workspace-service.md)

## 既知の判断

- 専用 Settings (title + hideCompleted) を持つ (`max_items` は持たない)
