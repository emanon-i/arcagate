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

## 機能契約

### workspace 削除の cascade 契約 (PH-CF-100)

workspace 配下の item 参照は `sys-ws-<id>` tag と widget config JSON `item_ids` の **2 経路**
ある。 cascade はこの **和集合** を対象集合とし、 「他 workspace から参照されない item」 のみ削除する。
workspace / item / tag / widget config 参照の削除は **1 transaction** で行い、 中途半端な状態
(workspace 行は消えたが item は残った 等) を残さない。 削除有無は `delete_items`
(必須引数、 implicit default を持たない) で制御する。

cascade 後に**孤立 item / dangling 参照を残してはならず**、 フロント `itemStore` も同時に
refresh して stale cache を残さない (E4/E5 ghost item 経路の解消)。

機械検出:

- 統合 test `test_delete_workspace_cascades_widget_config_item_ids` / `test_delete_workspace_mixed_payload_no_orphans_or_dangling`
- 統合 test `test_delete_workspace_keep_items_branch` で `delete_items=false` 分岐を検証
- `cmd_delete_workspace` の `delete_items: bool` 必須引数 (省略は型 / シリアライザ レベルで弾かれる)

## 既知の判断

- workspace 削除時の item cascade は 2 経路 (tag + widget config item_ids) の和集合で、
  1 transaction 化 + frontend itemStore refresh を契約化する (片方だけだと LibraryItemPicker
  追加 item が孤立するため)。
