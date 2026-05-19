# Tag Service

> backend feature / レイヤー: commands → service → repository → SQLite

## 目的

Tag (user 定義 / system) の CRUD と item_tags 連携を担う。お気に入り (starred) と type / workspace 別の分類軸を提供する。

## やること (必要処理)

- tag の create / list / update / delete
- system tag の管理: type 別 (`sys-type-exe` 等)、workspace 別 (`sys-ws-*`)
- starred (お気に入り) tag の付与 / 解除
- tag ごとの item 件数を集計して提供

## やらないこと (禁止 / scope 外)

- tag の階層構造を持たない (フラットな tag のみ)
- tag の並び順を service で決めない (sort_order は caller / DB)
- item の CRUD をしない ([Item Service](./item-service.md) の責務)

## 性能予算

- 件数集計は SQL GROUP BY (DB 側で効率的)

## 副作用 (state 変化 / persistence)

- `tags` / `item_tags` テーブルへ write

## 依存

- repository: `tag_repository`
- DB: `tags` / `item_tags`
- 依存される: Library / Favorites widget / Item Service (system tag 自動付与)

## 既知の判断

- tag name 空文字列は拒否
- system tag は `is_system = 1`。user からの直接編集対象外
