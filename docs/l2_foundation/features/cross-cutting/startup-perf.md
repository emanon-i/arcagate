# 起動 perf (Startup Performance)

> cross-cutting / アプリのコールドスタート全体の計測と契約。 規範本体は
> [`../../../l1_requirements/vision.md`](../../../l1_requirements/vision.md) §D1-D2。

## 目的

「アイコン click → 操作可能になるまで」 の wall time を予算内に収め、 回帰を CI で検知する。
backend setup と frontend 初期化を **通しで計測** し、 寄与要因が分かる状態を維持する。

## 棚卸し (PH-CF-900 A1-1)

3 観点で起動経路を整理する:

### user 目線 (アイコン click → 操作可能)

1. OS が `arcagate.exe` を spawn → Tauri runtime / WebView2 init
2. backend setup (DB / watcher / hotkey / tray の準備)
3. WebView2 が webview をロード → SvelteKit hydration
4. frontend が `<main>` を render し、 初回 IPC バッチが完了 → 操作可能

### 実装上の段階

| 段階                     | 場所                                                                                                                            | log target        | 計測 mark                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------ |
| `builder_plugins`        | `src-tauri/src/lib.rs:114` setup closure 突入時                                                                                 | `perf:startup`    | startup_timer 起点                   |
| `db_init`                | `src-tauri/src/lib.rs:209` migration + WAL + 破損 recovery 判定 完了時                                                          | `perf:startup`    | setup_timer 起点                     |
| `watcher`                | `src-tauri/src/lib.rs:247` filesystem 監視 watcher 起動完了時                                                                   | `perf:startup`    | setup_timer 起点                     |
| `setup_complete`         | `src-tauri/src/lib.rs:346` system tag / hotkey / tray 完了時                                                                    | `perf:startup`    | setup 内訳合計 + 総 total            |
| `layout_mount`           | `src/routes/+layout.svelte:onMount` (= SvelteKit hydration 完了)                                                                | `perf:startup-fe` | `STARTUP_FE_T0` (= module load) 起点 |
| `page_mount`             | `src/routes/+page.svelte:onMount` (= root page component mount)                                                                 | `perf:startup-fe` | 同上                                 |
| `init_ipc_done`          | `+page.svelte` で 起動時 IPC バッチ (config / items / tags / libraryStats / theme) が `Promise.allSettled` で完了 + `tick()` 後 | `perf:startup-fe` | 同上                                 |
| `main_paint`             | `requestAnimationFrame` × 2 で次フレーム commit を待った時点                                                                    | `perf:startup-fe` | 同上                                 |
| `exe_folder_scan` (任意) | Workspace 復元時、 `ExeFolderWatchWidget` mount → `cmd_scan_exe_folders` 完了                                                   | (widget local)    | `scanRequestId` の wall time         |

### 計測カバー範囲 (PH-CF-900 以降)

- backend 4 段階: `tests/perf/startup.spec.ts` が `perf:startup` log の `setup_complete` 行を parse
- frontend 4 段階: 同 spec が page console から `[perf:startup-fe]` 行を parse して cumulative を記録 (PH-CF-900 A1-1)
- exe-folder scan: `tests/perf/exe-scan-cache.spec.ts` で「2 回目以降の mount は cache hit」 を verify (PH-CF-900 A1-4)
- release binary 実測: `ARCAGATE_TEST_EXE=src-tauri/target/release/arcagate.exe` で `pnpm test:perf` 実行 (CI `perf.yml` で main push に hard gate、 PH-CF-900 A1-5)

## 機能契約

### 起動 perf 契約 (PH-CF-900)

アプリのコールドスタートは **backend setup (`perf:startup` log の 4 段階) と frontend 初期化
(`perf:startup-fe` の 4 段階) を通しで計測** する。 起動 perf 予算 ([`vision.md`](../../../l1_requirements/vision.md) D1 / D2) は:

- **D1 cold P95 ≤ 3200ms** (CI windows-latest 実測 baseline + 約 33% regression 帯)
- **D2 warm P95 ≤ 2800ms** (同上)

この gate は **regression 検出器** で、 実測 baseline (cold ~2450ms / warm ~2100ms 中央値) + ~33% buffer に設定する (「保守性 > 脆い perf チューニング」 方針、 詳細は `docs/l3_phases/paid-quality/audit/perf-budgets-2026-05-22.md` 参照)。 数値そのものの改善 (WebView2 cold init / backend setup 短縮) は別 phase に分離。

判定は **release binary** で `tests/perf/startup.spec.ts` が CI hard gate により実行する
(debug 参考値で合否判定しない)。 起動クリティカルパスに **重い同期 I/O / ネットワーク I/O
を置かない**:

- updater check は `+page.svelte` 上で `startUpdaterAutoCheck()` を経由し、 内部で `setTimeout(5_000)` 遅延発火 (`src/lib/state/updater.svelte.ts`)
- 起動時 IPC バッチ (config / items / tags / libraryStats / theme) は `$effect` で並列発火し await されない (page render を block しない)
- 重い fs walk (exe-folder scan) は cache 即表示 + background 差分 re-scan で UI を block しない (`features/backend/exe-scanner.md` §scan キャッシュ契約)

### 機械検出

- `tests/perf/startup.spec.ts` を release binary で実行する CI gate (`.github/workflows/perf.yml`):
  - `reportBudget` の `D1` (`startup-cold` `wall-p95` `lte 3200ms`)
  - `reportBudget` の `D2` (`startup-warm` `wall-p95` `lte 2800ms`)
- 段階内訳 (backend 4 + frontend 4) は console log に常時出力され、 回帰時にどの段階が
  原因かが分かる (例: `FE cumulative p95 (cold): layout_mount=NNNms / page_mount=NNNms / init_ipc_done=NNNms / main_paint=NNNms`)
- `tests/perf/exe-scan-cache.spec.ts` で 2 回目 mount の cache hit を verify

## 既知の判断

- frontend 計測は `console.info('[perf:startup-fe] ...')` を選んだ (CDP 経由で page console から parse 可能、 release build でも常時 emit、 backend log と prefix を揃えて pipeline 統一)
- backend `perf:startup` log は debug build では stdout、 release build では log file へ。 `startup.spec.ts` は process stdout / stderr を直接拾うため両 build で動く
- 計測値は実 DB scale (100+ items 想定) / 実 disk で取る — fixture が小さいと cache hit / cold walk の差が現れない (`CLAUDE.md` `feedback_perf_audit_before_measure` の方針)
