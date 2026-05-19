# File Search Service

> backend feature / レイヤー: commands → service → filesystem

## 目的

指定フォルダ配下のファイル / ディレクトリを列挙し、File Search widget へ一覧を提供する backend feature。

## やること (必要処理)

- `list_files`: depth 1-3 / limit (上限 5000) で再帰 walk しファイル一覧を返す
- `.git` / `node_modules` / `target` / dotfile を自動 skip
- cancel token (`AtomicBool`) で長い walk を中断可能

## やらないこと (禁止 / scope 外)

- ファイル名検索 (glob / regex) をしない (列挙のみ。絞り込みは widget の client-side)
- ファイル内容を検索しない
- depth / limit の上限を超えて walk しない
- インデックスを構築・永続化しない (都度 walk)

## 性能予算

- depth / limit 上限で walk 時間を有界化。cancel flag で長い walk を中断
- metadata stat のみで file open はしない

## 副作用 (state 変化 / persistence)

- なし (read-only)

## 依存

- 外部 crate なし
- state: `file_search_state` (cancel token 管理)
- 依存される: File Search widget

## 既知の判断

- フィルタ (substring) は widget 側 client-side。backend は raw 列挙に専念
