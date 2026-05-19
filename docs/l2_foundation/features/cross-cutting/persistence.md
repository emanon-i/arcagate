# 永続化 (Persistence)

> cross-cutting / DB schema 詳細は [`../../foundation.md`](../../foundation.md) §7

## 目的

アプリの全状態をローカルに永続化する仕組み。SQLite を単一の真実源とし、icon / 画像 / 壁紙はファイルシステムに置く。

## やること (必要処理)

- SQLite (rusqlite + WAL + `Mutex<Connection>`) に item / tag / workspace / widget / theme / config / launch_log 等を保存
- migration は forward-only、SQL を `include_str!` でバイナリ埋込
- ID は UUID v7 (時刻ソート可能 / import-export の衝突回避)
- timestamp は ISO 8601 TEXT
- icon → `%APPDATA%/icons/`、画像 → `%APPDATA%/image-scraps/`、壁紙 → `%APPDATA%/wallpapers/`
- localStorage は a11y override 等の frontend 軽量設定のみ

## やらないこと (禁止 / scope 外)

- cloud 同期をしない (ローカル完結)
- ORM を導入しない (rusqlite + 生 SQL)
- migration の rollback をしない (必要なら新 migration で fix forward)
- Connection Pool を使わない (1 user / 数百 item で Mutex で十分)
- 大きなバイナリ (icon / 画像) を DB に base64 で持たない (ファイルシステム)
- 重い処理を `Mutex<Connection>` を握ったまま実行しない (lock 解放後に I/O)

## 性能予算

- WAL で読み書き並行。`busy_timeout` 5 秒、page cache 8MB
- DB lock 競合は自動 3 回 retry + exponential backoff

## 副作用 (state 変化 / persistence)

- DB ファイルと APPDATA 配下のアセットがアプリの全永続状態
- `%APPDATA%\com.arcagate.desktop\` を wipe すると初期化 (setup wizard 再表示)

## 依存

- crate: `rusqlite` (bundled) / `rusqlite_migration` / `uuid`
- 依存される: 全 backend service

## 既知の判断

- `item_stats` は非正規化 (search 毎の COUNT を回避)
- `ON DELETE CASCADE` + 業務 cascade (widget config 除去 / watched_path 連動)
