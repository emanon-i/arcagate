# D7 / D8 perf measurement (R8-1 自動化)

`audit-final-r7.md` で **未検証** だった D7 / D8 を、Playwright fixture + `e2e-nightly.yml` で
nightly 自動計測する仕組みを R8-1 で確立。

## 計測対象

| ID     | 観点                                         | seed                                           | 操作                            | Pass criteria                         |
| ------ | -------------------------------------------- | ---------------------------------------------- | ------------------------------- | ------------------------------------- |
| **D7** | Library 1000 items 表示 + 検索 / ソート 応答 | 1000 url item を `cmd_create_item` で並列 seed | search input / sort field click | search P95 ≤ 200ms / sort P95 ≤ 200ms |
| **D8** | Workspace 100 widget 表示 + zoom 応答        | 1 workspace + 100 favorites widget             | Reset / Fit ボタン交互          | nav ≤ 5s / zoom P95 ≤ 200ms           |

## 実行方法

| 場面         | コマンド                                                 |
| ------------ | -------------------------------------------------------- |
| 開発 (local) | `pnpm test:e2e:perf`                                     |
| nightly CI   | `e2e-nightly.yml` 内 `Run perf E2E suite (D7 / D8)` step |
| 結果確認     | artifact `perf-measurements-nightly` (30 日保持)         |

## 出力 artifact

- `docs/l1_requirements/release-readiness/measurements/d7-library-1000.json`
- `docs/l1_requirements/release-readiness/measurements/d8-widget-100.json`

各 JSON は `samples_ms / min_ms / max_ms / mean_ms / p95_ms / threshold_ms / pass` を含む。

## 設計判断

### `@perf-nightly` tag で通常 e2e から除外

D7/D8 は seed に 5〜30 sec、計測込みで 1 spec あたり ~60 sec。PR ごとの CI に入れると
build 時間が肥大化するため、`pnpm test:e2e` (= `--grep-invert @perf-nightly`) からは除外、
nightly のみ実行。

### `continue-on-error: true`

perf threshold は **release blocker でない**。閾値超過しても CI を失敗させず、artifact に数値を
残すのが目的。閾値超過は次回 audit-final-rN.md の集計で検討。

### widget 種類 = favorites 固定

外部 IO 無し / 描画コスト軽量の `favorites` を使うことで、純粋に「100 widget の grid render
コスト」を測れる。重い widget (clipboard-history / file-search 等) を混ぜると計測ノイズが増える。

### seed の並列化 (batch=50)

`cmd_create_item` は単発 1〜2ms。1000 件 sequential = 1〜2 秒。`Promise.all` で 50 件並列にし、
全体 seed 時間を ~500ms 程度に短縮。SQLite 単一 Connection + Mutex 構成のため degree-of-parallelism
を更に上げても効果薄。

## 次の改善 (R9+ 候補)

- CDP `Performance.metrics` で Frames per Second 計測 → scroll で 50fps 維持の数値検証
- D9 IPC P95 (cmd_search_items / cmd_get_items_metadata_batch 1000 ids) も同枠で計測
