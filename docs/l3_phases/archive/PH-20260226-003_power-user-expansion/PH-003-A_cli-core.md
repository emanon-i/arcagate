---
status: done
sub_phase: PH-003-A
feature_id: F-20260226-012
priority: 1
---

# PH-003-A: CLI コア（run / list / search）

**対応REQ**: REQ-20260226-008
**元機能**: F-20260226-012 (core)

CLIバイナリ `arcagate_cli` を新規作成し、`run` / `list` / `search` の3サブコマンドを実装する。
`arcagate_lib` の Service Layer を共用することで、Tauri アプリと同一のビジネスロジックを使う。

## 技術要素

- `src-tauri/src/bin/arcagate_cli.rs` — エントリポイント
- `clap = { version = "4", features = ["derive"] }` を Cargo.toml に追加
- `Cargo.toml` に `[[bin]] name = "arcagate_cli"` セクション追加
- DB パス解決: `%APPDATA%\com.arcagate.desktop\arcagate.db`（`--db <path>` フラグで上書き可）
- `arcagate_lib::services::item_service` を直接呼び出す
- Tauri プロセスとの通信は本サブフェーズでは**不要**（DB 直接アクセスのみ）

## サブコマンド仕様

| サブコマンド     | 引数             | 動作                                                             |
| ---------------- | ---------------- | ---------------------------------------------------------------- |
| `run <name>`     | 名前（部分一致） | 最初にマッチしたアイテムを起動。起動にはOSのデフォルト実行を使う |
| `list`           | なし             | 全アイテムを表形式（ID, 名前, 種別, カテゴリ）で表示             |
| `search <query>` | 検索クエリ       | 名前・メモで部分一致検索し表形式で表示                           |

グローバルオプション:

- `--db <path>`: DBファイルパスを上書き
- `--json`: 出力をJSON形式にする（スクリプト連携用）

## 受け入れ条件

- [x] `cargo build --bin arcagate_cli` が成功する
- [x] `arcagate_cli list` でアイテム一覧が表示される
- [x] `arcagate_cli search <query>` で名前部分一致検索ができる
- [x] `arcagate_cli run <name>` でアイテムが起動できる（Windows: `start` コマンド相当）
- [x] `--db <path>` フラグでDBパスを指定できる
- [x] `--json` フラグでJSON出力に切り替えられる
- [x] `pnpm verify` が全通過する

## 検証コマンド

```bash
cargo build --bin arcagate_cli --manifest-path src-tauri/Cargo.toml
./src-tauri/target/debug/arcagate_cli list
./src-tauri/target/debug/arcagate_cli search "obs"
./src-tauri/target/debug/arcagate_cli run "Obsidian"
./src-tauri/target/debug/arcagate_cli --json list
```
