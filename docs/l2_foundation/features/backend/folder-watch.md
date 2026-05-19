# Folder Watch Service

> backend feature / レイヤー: commands → service → repository / watcher → SQLite

## 目的

監視対象フォルダ (watched_paths) の filesystem 変更を `notify` crate で監視し、tracked item の追従更新と新規フォルダ通知を行う backend feature。

## やること (必要処理)

- watched_paths の active path を `RecursiveMode::Recursive` で監視開始
- Create (dir): `folder://new-directory` イベントを emit
- Rename: tracked item の target path を追従更新
- Remove: tracked item を指す path のみ `item://path-not-found` を emit
- watched_paths の CRUD

## やらないこと (禁止 / scope 外)

- Modify (ファイル内容変更) イベントを処理しない
- tracked でない path の Remove で通知を emit しない (toast 爆増防止)
- 監視解除時に過去 path の後始末をしない
- フォルダ配下を自前で scan しない (列挙は [Exe Scanner](./exe-scanner.md))

## 性能予算

- watcher は専用 thread。event handler 内で AppServices lock を取り同期 DB write
- Remove イベントの filter で大量通知を抑制

## 副作用 (state 変化 / persistence)

- `watched_paths` テーブルへ write
- rename 時に `items` の target を更新
- frontend へ `folder://new-directory` / `item://path-not-found` event を emit

## 依存

- crate: `notify`
- repository: `item_repository` / `watched_path_repository`
- 依存される: Projects / Exe Folder widget、Settings (監視 folder 管理)

## 既知の判断

- Remove イベントは tracked item のみ emit (Codex High #3 対応)
