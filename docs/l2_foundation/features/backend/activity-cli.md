# Activity CLI (arcagate_cli の活動サブコマンド)

> backend feature (V2) / 既存 `src-tauri/src/bin/arcagate_cli.rs` (clap, 独立バイナリ, DB 直接アクセス) の拡張
> 「毎日眺める UI」 と対の、 「データを自由に抜き出す」 経路

## 目的

活動ログを **CLI から自由にクエリ・抽出・分類**できるようにする。 芯の両輪の一方 (もう一方は [Activity 画面](../../screens/activity.md) の glanceable UI)。 既存 `arcagate_cli` (list / search / run / export / config / describe 等 20 サブコマンド、 `--json` 対応) に活動系サブコマンドを足す。 データとコマンドを外に開くことで、 「自分のデータへの自由アクセス」 と「外部ツール・外部 AI による加工」 を成立させる。 期間サマリ Markdown を 1 押しで出せ、 その貼り先は user の任意 (Obsidian vault はその一例)。

## やること (必要処理)

- 既存 `arcagate_cli` に activity サブコマンド群を追加 (global `--db` / `--json` は継承):

| サブコマンド                          | 用途                                                                  |
| ------------------------------------- | --------------------------------------------------------------------- |
| `activity summary <period>`           | 日/週/月/任意 range のサマリを生成 (既定 Markdown)                    |
| `activity query [filters]`            | 生イベントを条件抽出 (app / path / type / 期間)                       |
| `activity files [--under <path>]`     | ファイル操作ログを path 単位で引く (「この日どの path を触ったか」)   |
| `activity export <period> [--format]` | 期間を指定形式で書き出し (md / csv / json / raw)                      |
| `activity template <sub>`             | Markdown テンプレートの list / get / set / edit / preview             |
| `activity vars <sub>`                 | テンプレート変数の list / describe (discoverability)                  |
| `activity tag <sub>`                  | カテゴリ分類ルールの list / set / rm / apply / untagged (冪等)        |
| `activity describe`                   | activity スキーマの introspection (既存 `describe` と同様、 agent 用) |

- **期間指定**: `today` / `yesterday` / `week` / `month` / `2026-06` / `2026-06-01..2026-06-30` を受ける
- **filter**: `--app <name>` / `--path <glob>` / `--type <create|edit|delete|rename|app_focus|media>` / `--category <tag>`
- **出力形式** (`--format`, 既定は用途別):
  - **md (既定)**: 期間サマリ Markdown。 YAML frontmatter (period / generated / totals) + 段落サマリ + カテゴリ rollup + Top Applications / Top File paths / 拡張子分布。 テンプレート機構で組み立てる (下記)。 貼り先は user の任意 (Obsidian vault はその一例)
  - **csv**: 表計算 / 評価面談用
  - **json**: プログラム連携 / 他ツール import
  - **raw**: 生イベント (デバッグ / 完全 backup)
- 「1 押しで数秒で結果ファイル」 の手軽さを保つ (重いクエリでも stream 出力)

### Markdown テンプレート機構 (default + custom)

Markdown サマリのフォーマットは **デフォルトテンプレート**と **ユーザーが組むカスタムテンプレート**の 2 本立てにする。 テンプレートは Obsidian Web Clipper と同様に **`{{変数}}` を差し込んで組み立て**、 実データでプレビューして確認できる。 フォーマットは **コマンドで書き換える** (ファイルを直接編集させず CLI で完結):

| コマンド                                        | 用途                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| `activity template list`                        | 利用可能テンプレート一覧 (default + 保存済 custom)       |
| `activity template get [name]`                  | テンプレート本文を出力 (既定は現在の default)            |
| `activity template set <name> <file>`           | テンプレートを保存 / 上書き (`-` 指定で stdin から)      |
| `activity template edit <name>`                 | `$EDITOR` で編集して保存                                 |
| `activity template preview <name> --period <p>` | 実データを流し込んだ**レンダリング結果をプレビュー**表示 |
| `activity summary <period> --template <name>`   | 指定テンプレートでサマリ出力 (省略時は default)          |

- **変数の discoverability**: 使える変数の一覧と各変数の意味を CLI で引ける:
  - `activity vars list` — 使える `{{変数}}` の一覧 (`--json` で機械可読)
  - `activity vars describe <var>` — その変数がどの情報を出すか + 例を表示
- 変数の例: `{{period}}` / `{{generated}}` / `{{total_active}}` / `{{top_apps}}` / `{{top_paths}}` / `{{ext_distribution}}` / `{{categories}}` / `{{file_events}}` / `{{sessions}}`。 一覧の正典は `activity vars list` の出力とする (doc に二重管理しない)
- custom テンプレートは DB (`config` KV) に保存し、 default はコードに埋め込む。 default を消す破壊操作はさせない

### カテゴリ分類 (`activity tag`) — コマンドベース・冪等・外部 AI 駆動

ActivityWatch 的なカテゴリ分類を **コマンドで、 何度でもやり直せる (冪等・再実行可能)** 形で提供する。 分類ルールは [Activity Store](./activity-store.md) の `activity_category_rule` に保存し、 イベントへのカテゴリ付与はルールから決定論的に再計算する:

| コマンド                                                            | 用途                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `activity tag list`                                                 | 現在の分類ルール一覧 (`--json` 可)                                                  |
| `activity tag set <match_kind> <pattern> <category> [--priority N]` | ルールを追加 / 上書き (matcher キーで upsert = 冪等)                                |
| `activity tag rm <match_kind> <pattern>`                            | ルール削除                                                                          |
| `activity tag apply`                                                | 現在のルールでカテゴリを再計算 (何度流しても同結果 = 冪等)                          |
| `activity tag untagged [--period <p>]`                              | どのルールにも当たらないイベント / アプリ / path を出力 (`--json`、 分類対象の抽出) |

**AI をアプリの中に入れない**。 代わりにデータとコマンドを外に開き、 **user 自身の AI (Claude / Codex 等) に分類させる** 導線にする:

1. `activity tag untagged --json` で未分類データを吐く
2. 外部 AI がそれを読み、 分類して `activity tag set ...` コマンド列を生成する
3. そのコマンド列を流し込み、 `activity tag apply` で再計算する

`set` は matcher キーで upsert、 `apply` は冪等なので、 この導線は何度でも安全に再実行できる。

## やらないこと (禁止 / scope 外)

- **CLI から任意コード実行の経路を作らない** — activity サブコマンドは read / export / 分類ルール編集のみ。 収集 collector の admin 機能を CLI から呼ばない ([権限分離](../cross-cutting/activity-privilege-separation.md))
- クラウドへ送らない — 出力はローカルファイル / stdout のみ
- 独自クエリ言語 (AQL 等) を発明しない (ActivityWatch の AQL 学習コストを反面教師に) — flag ベースの filter に絞る。 複雑クエリが要れば `--json` で吐いて外部処理
- **AI をアプリ / CLI の中に組み込まない** — 分類は `activity_category_rule` ベースで決定論的に行う。 AI が要る判断は `untagged` を外に出して user 自身の AI にやらせ、 結果を `activity tag set` で受ける (AI 非依存・外部 AI 駆動)
- 部分選択的な import はしない (既存 export/import の全体 merge 方針を踏襲)

## 性能予算

- クエリは timestamp index を使う。 期間で絞ってから集計 (全表スキャンしない)
- Markdown 生成はテンプレ + 集計で軽量。 大量期間は stream で

## 副作用 (state 変化 / persistence)

- read 専用。 export はローカルファイル書き出しのみ (DB を変更しない)

## 依存

- 既存: `arcagate_cli.rs` (clap, `--json`, `describe` パターン)
- feature: [Activity Store](./activity-store.md) (読み出し元) / [Export / Import Service](./export-import.md) (既存 export と整合)
- 外部連携先: 月次振り返り運用 / 外部 AI (Claude / Codex 等) による分類・加工 / Markdown 取り込み先 (Obsidian vault はその一例)

## 既知の判断

- **export は CSV / JSON / Markdown サマリ / raw の 4 形式**を同格で提供する。 Markdown サマリはテンプレート機構 (default + custom) で組み立て、 貼り先を特定ツールに前提しない (Obsidian はその一例)
- **Markdown フォーマットはコマンドで書き換える** — テンプレートの取得 / 設定 / 編集 / プレビューを `activity template` に集約し、 変数は `activity vars list` / `describe` で自己記述する (Obsidian Web Clipper 型の変数テンプレート + プレビュー)
- **カテゴリ分類はルールベース + 冪等**。 `activity tag apply` は何度流しても同結果、 `set` は matcher キーで upsert。 これにより外部 AI が生成したコマンド列を安全に再実行できる
- **AI はアプリ外**。 CLI が分類対象データ (`untagged`) を吐き、 user 自身の AI が分類して tag コマンドを流し込む導線にする (アプリ内蔵 AI を持たない)
- **AQL 的クエリ言語は作らない** — flag filter + `--json` 出力の組合せで足りる範囲に絞り、 ActivityWatch の「振り返りに query 必須」 という障壁を作らない
- 既存 `describe` に倣い `activity describe` を置く (agent / skill から schema 自己記述で叩けるように)
