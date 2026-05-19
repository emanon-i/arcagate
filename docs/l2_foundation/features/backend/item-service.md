# Item Service

> backend feature / レイヤー: commands → service → repository → SQLite

## 目的

Item (exe / url / folder / script / command の 5 type) の CRUD と tag 連携、検索を担う backend feature。Library / Palette / 各 widget の登録・列挙の単一経路。

## やること (必要処理)

- item の create (UUID v7 生成 → insert → system tag 自動付与 + user tag 設定を 1 transaction)
- list / get / update / delete
- 検索: label / aliases の fuzzy match + workspace 名の部分一致 (U-9)
- bulk import (workspace init / exe scan 登録時の一括 insert)
- item tag の add / remove / set、enabled / disabled 制御
- URL D&D 時の title 取得、ブックマーク HTML の取込

## やらないこと (禁止 / scope 外)

- item の指す物理ファイルを削除・移動しない (DB レコードのみ操作)
- icon cache の GC をしない (caller / 別 feature の責務)
- Repository を跨いだ相互参照をしない (service 層で組み合わせる)
- item 起動をしない ([Launcher](./launcher.md) の責務)
- 検索でファイル内容や FS 全体を走査しない (DB の label / aliases / tag のみ)

## 性能予算

- 検索は SQL index (`idx_items_label` 等) 前提。1 user / 数百 item で Pool 不要
- create / update は単一 transaction (Drop で auto-rollback)

## 副作用 (state 変化 / persistence)

- `items` / `item_tags` / `tags` テーブルへ write
- create 時に system tag (`sys-type-*` / `sys-ws-*`) を自動生成

## 依存

- repository: `item_repository` / `tag_repository` / `workspace_repository` / `icon_cache_repository`
- DB: `items` / `item_tags` / `tags`
- 依存される: Library / Palette / Favorites / Recent / Stats / Item / Projects / Exe Folder widget

## 既知の判断

- label 空文字列は拒否 (InvalidInput)
- ORM 不使用 (rusqlite + 生 SQL)、UUID v7 で import/export の ID 衝突回避
