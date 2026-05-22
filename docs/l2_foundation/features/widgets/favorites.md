# Favorites Widget

> widgetType: `favorites` / category: library / 配置画面: [Workspace](../screens/workspace.md)

## 目的

Library で starred (お気に入り) にした item を最大 N 件表示し、ワンクリック起動できる widget。

## やること (必要処理)

- starred tag の item を `cmd_search_items_in_tag` で取得
- max_items 上限と sort_field (default / name) を適用
- is_enabled=false の item と per-widget hide 対象を除外
- item click で起動、右クリック context menu

## やらないこと (禁止 / scope 外)

- file system を scan しない
- starred 状態を widget から変更しない (Library 側の責務)
- polling / timer を持たない (itemStore の変化に reactive 追従)
- metadata / icon を widget 自身で IPC 取得しない

## 性能予算

- 描画は itemStore reactive read。IPC は初回ロードと起動時の単発のみ

## 副作用 (state 変化 / persistence)

- widget config (`max_items` / `sort_field`) を `workspace_widgets.config` JSON に保存
- per-widget hide state を読み込み

## 依存

- IPC: `cmd_search_items_in_tag` / `cmd_launch_item`
- DB: `items` / `item_tags` / `tags` (starred system tag)
- config schema: `max_items` (default 10) / `sort_field`
- backend: [Item Service](../backend/item-service.md) / [Tag Service](../backend/tag-service.md)

## 既知の判断

- Settings は共通の `CommonMaxItemsSettings` (max_items + sort_field) を使用
