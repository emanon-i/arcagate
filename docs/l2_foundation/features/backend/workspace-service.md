# Workspace Service

> backend feature / レイヤー: commands → service → repository → SQLite

## 目的

Workspace (multi-page レイアウト) と配置 widget の CRUD、system tag 同期を担う backend feature。

## やること (必要処理)

- workspace の create (workspace + `sys-ws-<id>` system tag を自動生成)
- workspace の list / update / delete
- widget の add / remove / list、position / config 更新
- per-widget hide (`widget_item_hides`) の add / remove
- workspace rename 時に対応 system tag 名を同期
- workspace 削除時、その workspace 専用 item も Library から除去 (孤児 item 防止)

## やらないこと (禁止 / scope 外)

- widget の中身の処理をしない (各 widget の責務)
- workspace の自動 export / backup をしない
- default workspace の自動生成をしない (Home auto-create は frontend)

## 性能予算

- 単純な DB CRUD。widget config 更新は逐次 (bulk なし)

## 副作用 (state 変化 / persistence)

- `workspaces` / `workspace_widgets` / `widget_item_hides` / `tags` / `items` テーブルへ write

## 依存

- repository: `workspace_repository` / `widget_item_hides_repository`
- DB: `workspaces` / `workspace_widgets` / `widget_item_hides` / `tags` / `items`
- 依存される: Workspace 画面、全 widget (config 保存)

## 既知の判断

- workspace 削除時の item cascade は 2026-05-17 の bugfix (孤児 item 残留の修正)
