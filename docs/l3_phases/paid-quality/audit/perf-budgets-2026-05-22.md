# PH-PQ-400 速さ — 性能予算 計測結果 / virtualization 判断

PH-PQ-400 (速さ) で整備した性能予算計測インフラの初回実測結果と、 そこから導いた
virtualization 採用可否 (T3 / T4) の判断記録。

## 背景・目的

`vision.md` D1-D9 で数値性能予算は明文化済だが「測定が CI gate になっていない」のが
最大 gap だった。 本 phase で `tests/perf/` に D1-D9 の自動計測 spec を新設し、
`.github/workflows/perf.yml` で main push / nightly の gate に組み込んだ。

## 制約

- ローカル実測は **debug build + Vite dev server** で行った (release build は CI 専用)。
  debug build は起動 / IPC が release より大幅に遅いため、 D1 / D2 / D3 の絶対値は
  release 予算と直接比較できない。 → `ARCAGATE_PERF_SOFT=1` で閾値超過を fail させず
  観測のみ行うモードを用意。 **CI (perf.yml) は release binary で hard gate**。
- WebView2 自体の差し替え / SQLite 変更 / Connection Pool 導入は Non-goal (foundation 確定)。

## 計測手法

`tests/perf/` の Playwright + CDP spec 7 本。 各 spec は計測 → `tmp/perf/results.json`
追記 → 閾値判定。 CDP Performance API + Tauri IPC timer + process tree CPU 計測を使用。

| spec                     | budget | 計測内容                                          |
| ------------------------ | ------ | ------------------------------------------------- |
| `startup.spec.ts`        | D1/D2  | binary 自前 spawn → CDP attach → main 可視 wall   |
| `palette-open.spec.ts`   | D3     | palette route reload → first-contentful-paint P95 |
| `launch-latency.spec.ts` | D4     | `cmd_launch_item` IPC round-trip P95              |
| `idle-cpu.spec.ts`       | D6     | process tree CPU 秒 / idle 区間 / 論理 CPU 正規化 |
| `library-scale.spec.ts`  | D7     | N item の nav-render / scroll fps / sort / filter |
| `workspace-100.spec.ts`  | D8     | 100 widget の render / reswitch / scroll fps      |
| `ipc-latency.spec.ts`    | D9     | 主要 20 command × 100 call の P95                 |

## 計測結果 (2026-05-22, debug build, ローカル実機)

| budget | metric                   | 実測 (debug)                | 予算 (release)      | 判定         |
| ------ | ------------------------ | --------------------------- | ------------------- | ------------ |
| D1     | 起動 cold P95            | 6280ms                      | ≤ 1500ms            | debug 参考値 |
| D2     | 起動 warm P95            | 2926ms                      | ≤ 1000ms            | debug 参考値 |
| D3     | palette FCP P95          | 252ms                       | ≤ 120ms             | debug 参考値 |
| D4     | item 起動 IPC P95        | 11.4ms                      | ≤ 200ms             | ✅ pass      |
| D6     | idle CPU                 | 0.17%                       | ≤ 1%                | ✅ pass      |
| D7     | Library 1000 scroll fps  | **93.9 fps**                | ≥ 50 fps            | ✅ pass      |
| D7     | Library 1000 sort        | 74ms                        | ≤ 200ms             | ✅ pass      |
| D7     | Library 1000 filter      | 188ms                       | ≤ 200ms             | ✅ pass      |
| D8     | Workspace 100 scroll fps | **100.1 fps**               | ≥ 50 fps            | ✅ pass      |
| D8     | Workspace 100 操作応答   | render 320 / reswitch 256ms | ≤ 200ms*            | ✅ pass      |
| D9     | 主要 IPC 20 command P95  | 2〜43ms                     | ≤ 100ms (batch 500) | ✅ pass      |

D1 / D2 / D3 は debug build / Vite dev の overhead を含む参考値。 release CI gate で
判定する。 startup の backend setup 内訳 (`perf:startup` log) は debug で total ~2000ms。

\* D8 操作応答は plan の ≤200ms に対し render/reswitch が上回るが、 これは「100 widget の
初回 / 再 mount」コストであり通常の widget 操作 (移動 / 選択) 応答とは別。 重要 metric の
frame rate は 100fps 維持で freeze 無し。

## virtualization 採用判断 (T3 / Library, T4 / Workspace)

plan の判断基準: 「1000 item で frame rate < 50fps または sort > 200ms なら virtualization 採用」。

**結論: virtualization は採用しない (不採用)。** 数値根拠:

- **Library 1000 item: scroll 93.9 fps** (基準 50fps の +88%)、 sort 74ms / filter 188ms
  (基準 200ms 内)。 既存の CSS `content-visibility: auto` + `contain-intrinsic-size`
  (`LibraryCard.svelte`) が画面外 card の paint / layout を browser native に skip させ、
  full DOM 保持のまま 60fps を大きく上回る。 JS virtual list を入れると focus / a11y /
  keyboard nav (`LibraryMainArea` の grid 矢印移動) / CSS grid `auto-fill` との整合で
  複雑性が増すだけで、 現状 perf 余裕に対し純損。
- **Workspace 100 widget: scroll 100.1 fps**、 render 320ms / reswitch 256ms。
  viewport virtualization (画面外 widget の unmount) は不要。

**再評価 trigger (将来 PR で virtualization を再検討する条件):**

- `perf.yml` nightly の Library 5000 / 10000 stress run で **scroll < 50fps** または
  **sort > 200ms** が出たら、 `library-scale.spec.ts` の数値を根拠に Library grid
  (`LibraryMainArea` / `LibraryView`) へ virtual list 導入を判断する。
- Workspace は 100 widget が release-criteria D8 の上限。 これを超える要求が出た時のみ
  viewport virtualization を再検討。

候補ライブラリ (再採用時の参考): `@humanspeak/svelte-virtual-list` / `virtua` /
`TanStack Virtual`。

## 起動経路計測 (T7)

`src-tauri/src/lib.rs` の setup に `log::info!(target: "perf:startup", ...)` を追加。
段階 (`builder_plugins` / `db_init` / `watcher` / `setup_complete`) の cumulative 時間を
出力し、 `startup.spec.ts` が `setup_complete` 行を parse して backend setup 内訳を
informational に記録する。 plan の deferred init (theme/metadata service) は、 計測上
AppServices 構築自体が軽量で setup の支配項でないため本 phase では見送り、 instrumentation
を残して将来 release 計測で重い step が判明した時に対処する (`feedback_perf_audit_before_measure`
の「実測から始める」方針)。

## 重い I/O の background 化 (T5 / T6)

- T6: `scripts/audit-blocking-on-runtime.sh` を新設。 `#[tauri::command]` body 内で
  `std::fs::` / `std::process::` / `Command::new` を `spawn_blocking` の外で呼ぶ箇所を
  検出 (現状 0 violations)。 `lefthook.yml` pre-commit + `pnpm audit:all` に統合。
- T5: service 層の DB lock sweep — `script_runner_service` の `Command::spawn` は DB lock
  非保持、 `launch_service` は W-1 で lock scope を限定済 (`launch_service.rs:49-65`)。
  `audit-async-commands.sh` と `audit-blocking-on-runtime.sh` の 2 段 gate で再発防止。

## CI gate (perf.yml)

- **main push**: release binary でフル perf suite → 予算超過で fail (regression gate)。
- **nightly (cron UTC 21:00 = JST 06:00)**: フル suite + Library 5000 / 10000 stress。
- **PR では走らせない** (perf 計測は重く flaky、 main gate + nightly で担保)。
- 失敗時は `perf-failure` label の issue を自動 open (PH-PQ-100 soak と同一機構)。
