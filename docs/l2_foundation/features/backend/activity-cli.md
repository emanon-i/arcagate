# Activity CLI (arcagate_cli の活動サブコマンド)

> backend feature (V2) / 既存 `src-tauri/src/bin/arcagate_cli.rs` (clap, 独立バイナリ, DB 直接アクセス) の拡張
> 「毎日眺める UI」 と対の、 「データを自由に抜き出す」 経路

## 目的

活動ログを **CLI から自由にクエリ・抽出**できるようにする。 芯の両輪の一方 (もう一方は [Activity 画面](../../screens/activity.md) の glanceable UI)。 既存 `arcagate_cli` (list / search / run / export / config / describe 等 20 サブコマンド、 `--json` 対応) に活動系サブコマンドを足す。 第一の駆動ユースケースは **Obsidian への情報集約** — 月次振り返りに貼れる Markdown を 1 押しで出す。 CLI が役立つのはまさにこの「自分のデータへの自由アクセス」。

## やること (必要処理)

- 既存 `arcagate_cli` に activity サブコマンド群を追加 (global `--db` / `--json` は継承):

| サブコマンド                          | 用途                                                                  |
| ------------------------------------- | --------------------------------------------------------------------- |
| `activity summary <period>`           | 日/週/月/任意 range のサマリを生成 (既定 Markdown)                    |
| `activity query [filters]`            | 生イベントを条件抽出 (app / path / type / 期間)                       |
| `activity files [--under <path>]`     | ファイル操作ログを path 単位で引く (「この日どの path を触ったか」)   |
| `activity export <period> [--format]` | 期間を指定形式で書き出し (md / csv / json / raw)                      |
| `activity describe`                   | activity スキーマの introspection (既存 `describe` と同様、 agent 用) |

- **期間指定**: `today` / `yesterday` / `week` / `month` / `2026-06` / `2026-06-01..2026-06-30` を受ける
- **filter**: `--app <name>` / `--path <glob>` / `--type <create|edit|delete|rename|app_focus|media>` / `--category <tag>`
- **出力形式** (`--format`, 既定は用途別):
  - **md (第一)**: Obsidian-friendly。 YAML frontmatter (period / generated / totals) + 段落サマリ + カテゴリ rollup + Top Applications / Top File paths / 拡張子分布。 **`activity-summary` skill の format 互換** (vault にそのまま流し込める)
  - **csv**: 表計算 / 評価面談用
  - **json**: プログラム連携 / 他ツール import
  - **raw**: 生イベント (デバッグ / 完全 backup)
- 「1 押しで数秒で結果ファイル」 の手軽さを保つ (重いクエリでも stream 出力)

## やらないこと (禁止 / scope 外)

- **CLI から任意コード実行の経路を作らない** — activity サブコマンドは read / export のみ。 収集 collector の admin 機能を CLI から呼ばない ([権限分離](../cross-cutting/activity-privilege-separation.md))
- クラウドへ送らない — 出力はローカルファイル / stdout のみ
- 独自クエリ言語を発明しない (ActivityWatch の AQL 学習コストを反面教師に) — 当面は flag ベースの filter に絞る。 複雑クエリが要れば `--json` で吐いて外部処理
- 部分選択的な import はしない (既存 export/import の全体 merge 方針を踏襲)

## 性能予算

- クエリは timestamp index を使う。 期間で絞ってから集計 (全表スキャンしない)
- Markdown 生成はテンプレ + 集計で軽量。 大量期間は stream で

## 副作用 (state 変化 / persistence)

- read 専用。 export はローカルファイル書き出しのみ (DB を変更しない)

## 依存

- 既存: `arcagate_cli.rs` (clap, `--json`, `describe` パターン)
- feature: [Activity Store](./activity-store.md) (読み出し元) / [Export / Import Service](./export-import.md) (既存 export と整合)
- 外部連携先: vault の `activity-summary` skill (Markdown format の互換基準) / 月次振り返り運用

## 既知の判断

- **Markdown を第一形式**に据える (Obsidian 集約が駆動ユースケース)。 CSV/JSON/raw は同格で提供
- **AQL 的クエリ言語は作らない** — flag filter + `--json` 出力の組合せで足りる範囲に絞り、 ActivityWatch の「振り返りに query 必須」 という障壁を作らない
- 既存 `describe` に倣い `activity describe` を置く (agent / skill から schema 自己記述で叩けるように)
