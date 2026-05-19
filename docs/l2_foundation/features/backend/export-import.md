# Export / Import Service

> backend feature / レイヤー: commands → service → filesystem + SQLite

## 目的

item / tag / config を JSON でバックアップ・復元し、DB 全体のリセットを行う backend feature。

## やること (必要処理)

- `export_json`: items / tags / item_tags / config を JSON ファイルに書き出し (version 付き)
- `import_json`: JSON を読み `INSERT OR REPLACE` で merge import (再起動不要)
- DB reset / kill switch: export でバックアップ後に DB を truncate

## やらないこと (禁止 / scope 外)

- 部分選択的な import をしない (全体 merge)
- ファイル暗号化 / 差分バックアップをしない
- cloud へのアップロードをしない (ローカルファイルのみ)

## 性能予算

- item 数に対し線形。大量データは progress 表示を検討

## 副作用 (state 変化 / persistence)

- JSON ファイルの読み書き
- import / reset 時に `items` / `tags` / `item_tags` / `config` テーブルへ write

## 依存

- crate: `serde_json`
- 依存される: Settings 画面 (Data ペイン)

## 既知の判断

- 現行 export version は v2。JSON パース失敗は InvalidInput error
- reset / kill switch は export_json でバックアップを取ってから truncate
