---
id: PH-CF-900
status: planning
batch: clean-feedback
type: 性能改善
era: Distribution Hardening
parent: README.md
---

# PH-CF-900: 起動 perf — アプリのコールドスタート全般

## 元 user fb (検収項目)

- **A1**: 起動が遅い。 `cmd_scan_exe_folders` のコールドが約 10.4 秒かかるのは実測済みの寄与要因の 1 つだが、 指摘の本意は **「アプリ自体の起動が遅い」** であり exe scan に限定した話ではない。 release exe で速くなるかも含め要計測 (user 談: 「実行ファイルになれば速くなるといいな」)

## 問題

アプリのコールドスタートが体感で遅い。 exe-folder 監視 widget の cold scan (~10.4s) は実測済みの寄与要因の 1 つだが、 それだけが原因ではない。 **アプリ起動全体** — backend setup (builder / plugin / DB 初期化 / watcher / hotkey / tray)、 frontend 初期化 (WebView2 init / SvelteKit hydration / 起動時 IPC バッチ / updater check)、 Workspace 復元時の widget scan — を通しで計測し、 寄与要因を全部洗い出して予算内に収める必要がある。

現状の計測は **debug build 参考値のみ** で release 実測がない。 user は配布 exe での速度を期待しており、 release build での計測が要る。

## 引用元 guideline doc

| Doc                                                            | Section                              | 採用判断への寄与                                           |
| -------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `docs/l1_requirements/vision.md`                               | D1-D9 性能予算                       | 起動 cold P95 ≤ 1500ms / warm ≤ 1000ms                     |
| `docs/l3_phases/paid-quality/audit/perf-budgets-2026-05-22.md` | D1/D2                                | 既存計測 (debug 参考値) と CI gate 化の gap                |
| `docs/l2_foundation/features/backend/exe-scanner.md`           | scan                                 | exe scan キャッシュ契約                                    |
| `docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` | W-2 / W-9                            | キャッシュ無し cold walk の既存 audit                      |
| `CLAUDE.md`                                                    | `feedback_perf_audit_before_measure` | 計測は実 DB / 実 target / 実 disk、 実装より先に処理棚卸し |

## Fact 確認 (起動経路の棚卸し)

### backend setup の段階 (`src-tauri/src/lib.rs`、 `perf:startup` log で計測済)

`lib.rs:80` `startup_timer` 起点。 setup closure (`:111-353`) 内で 4 段階を `log::info!(target: "perf:startup", ...)` で出力:

1. **`builder_plugins`** (`:114-118`) — `tauri::Builder` + plugin 7 種 (global-shortcut / autostart / dialog / fs / shell / clipboard / updater) の登録
2. **`db_init`** (`:209-213`) — `db::initialize_with_recovery` (`:202`)。 migration 適用 (`include_str!` 埋込) + WAL + 破損 recovery 判定
3. **`watcher`** (`:247-251`) — `watcher::start_watcher` (`:245`) でファイルシステム監視起動
4. **`setup_complete`** (`:346-351`) — system tag 初期化 (`:241`) / hotkey 検証・登録 (`:265-288`) / tray 構築 (`:291-330`)。 `setup={}ms total={}ms` を出力

perf-budgets doc によると debug build で backend setup total ~2000ms。

### frontend 初期化 (現状 **未計測**)

`+page.svelte` / `+layout.svelte` が mount 時に走らせる処理 — `perf:startup` log に含まれず計測されていない:

- WebView2 プロセス init + SvelteKit hydration (`+layout.ts` `prerender=true / ssr=false`)
- `+layout.svelte:66-69` — `installErrorMonitor` / `installLongtaskObserver` / `installResourceObserver`、 `:52` `takeStartupNotices()` IPC
- `+page.svelte:51-56` — 起動時 IPC バッチ: `configStore.loadConfig()` / `itemStore.loadItems()` / `loadTags()` / `loadLibraryStats()` (4 本、 `$effect` で並列発火・await されない)
- `+page.svelte:60` — `themeStore.loadTheme()` IPC
- `+page.svelte:71` — `startUpdaterAutoCheck()` (ネットワーク I/O を伴う updater check)
- `activeView` が `'workspace'` 復元時 (`+page.svelte:37-38`) — WorkspaceLayout → widget mount → exe-folder widget が cold scan (~10.4s、 下記)

### exe-folder scan (寄与要因の 1 つ)

`cmd_scan_exe_folders` は `ExeFolderWatchWidget.svelte:170` の `$effect` からのみ呼ばれ、 起動シーケンス本体には無い。 前回 Workspace タブを開いていた user が起動直後に踏む。 `exe_scanner_service.rs:64-169` の `walk()` が **キャッシュ無しの cold sync 再帰 fs walk** (`:85,:146` で metadata) を毎 mount 実行 — これが ~10.4s の中身。 `spawn_blocking` で event loop はブロックしないが、 widget の表示は scan 完了までかかる。

### 計測の現状

- `tests/perf/startup.spec.ts` が D1 (cold ≤ 1500ms) / D2 (warm ≤ 1000ms) の wall time を計測。 binary 自前 spawn → CDP attach → `<main>` 可視までを測る。 `perf:startup` log の `setup_complete` 行も parse
- `ARCAGATE_TEST_EXE` 環境変数で **release binary を指定可能** (未指定なら debug)。 現状 CI / perf-budgets doc は debug 参考値 (cold 6280ms / warm 2926ms) のみで **release 実測が無い**

## スコープ

- アプリのコールドスタート全体を計測し、 遅さの寄与要因を全部洗い出す (backend setup 4 段階 + frontend 初期化 + Workspace 復元時 scan)
- frontend 初期化を計測可能にする (現状 `perf:startup` log は backend のみ)
- **release build での起動時間を計測** (debug 参考値でなく)
- 寄与要因ごとに改善し、 起動 perf 予算 (D1 cold ≤ 1500ms / D2 warm ≤ 1000ms) を release CI hard gate にする
- exe scan のキャッシュ化は本 phase 内の **1 タスク**

## やらないこと

- exe scanner の検出ロジック再設計 — PH-CF-400 (本 PH の exe scan キャッシュは 400 で再設計済の scanner に載せる)
- 監視 widget の chrome / 設定 — PH-CF-500
- updater 機能そのものの変更 — 起動時 updater check の遅延発火 (起動経路から外す) は perf 改善として扱うが、 updater のロジックは変えない

## 具体タスク

1. **寄与要因の全棚卸し + 計測 instrumentation**:
   - backend: `perf:startup` log の 4 段階 (`builder_plugins` / `db_init` / `watcher` / `setup_complete`) は計測済。 各段階の内訳 (migration 適用時間 / WAL / recovery 判定 等) が必要なら細分化
   - frontend: `+layout.svelte` / `+page.svelte` の mount → 起動時 IPC バッチ完了 → `<main>` 可視 → 初回 interactive までを **計測可能にする**。 `performance.mark` / `performance.measure` か `perf:startup` 相当の log を frontend に新設し、 `startup.spec.ts` が拾えるようにする
   - 「user 目線の起動 (アイコン click → 操作可能)」 「実装上の段階」 「現状の計測でカバーされている範囲」 の 3 観点で棚卸し表を doc 化 (`feedback_perf_audit_before_measure`)
2. **release build での計測**:
   - `startup.spec.ts` を `ARCAGATE_TEST_EXE` = release binary で実行し、 cold / warm の release 実測値を取得
   - debug 参考値 (cold 6280ms / warm 2926ms) と release 実測の差を perf-budgets doc に記録。 「release でどれだけ速くなるか」 を数値で示す
   - 計測は実 DB scale (100+ items) / 実 disk で行う
3. **寄与要因ごとの改善** (計測結果ドリブン、 棚卸しで上位の要因から):
   - backend setup: `db_init` の migration / `watcher` 起動 / hotkey・tray 構築で削れる箇所
   - frontend: 起動時 IPC バッチ (`+page.svelte:51-56,60` の 5 本) の並列化・優先度付け、 `startUpdaterAutoCheck()` (`:71`) を起動クリティカルパスから外して遅延発火
   - 改善は計測で寄与が確認された要因に限定 (推測で削らない)
4. **exe scan キャッシュ化** (本 phase 内の 1 タスク):
   - PH-CF-400 で再設計した scan の出力を DB に persist。 widget mount 時はキャッシュ即表示 → background で差分 re-scan
   - cache key = watch_path + extensions + scan_depth。 watch_path / extensions / scan_depth 変更時と watcher のファイル変更検知で invalidate
5. **起動 perf 予算の release CI gate**:
   - D1 cold ≤ 1500ms / D2 warm ≤ 1000ms を **release binary** で `startup.spec.ts` が判定し、 CI hard gate にする
   - 段階内訳 (backend 4 段階 + frontend) も perf-budgets doc に記録し、 回帰時にどの段階かが分かるようにする

## 受け入れ条件 (機械検出)

- [ ] 起動寄与要因の棚卸し表が doc 化 (backend 4 段階 + frontend 初期化 + Workspace 復元 scan、 各々の release 実測内訳)
- [ ] `startup.spec.ts` が **release binary** で D1 cold P95 ≤ 1500ms / D2 warm P95 ≤ 1000ms を判定し、 CI hard gate として実行される
- [ ] frontend 初期化が `performance.measure` 等で計測可能になり、 起動段階の内訳が backend だけでなく frontend も取れる
- [ ] perf test: exe-folder widget の 2 回目以降の mount で scan がキャッシュヒットし cold walk が走らない
- [ ] unit: exe scan cache key (watch_path + extensions + scan_depth) が変わるとキャッシュが invalidate される
- [ ] perf-budgets doc に release 実測値と debug 参考値の対比が記録される

## 機能契約の追記

`features/backend/exe-scanner.md`:

> **scan キャッシュ契約**: exe scan の結果は DB にキャッシュする。 widget mount 時はキャッシュを即表示し、 cold walk を UI 経路でブロックしない。 background で差分 re-scan する。 キャッシュは watch_path / extensions / scan_depth / watcher 検知のファイル変更で invalidate する。

`features/cross-cutting/` (perf 関連、 新規) または `vision.md` の D1-D9 節:

> **起動 perf 契約**: アプリのコールドスタートは backend setup (`perf:startup` log の 4 段階) と frontend 初期化を通しで計測する。 起動 perf 予算 (D1 cold ≤ 1500ms / D2 warm ≤ 1000ms) は **release binary** で CI hard gate により判定する。 debug 参考値で合否判定しない。 起動クリティカルパスに重い同期 I/O / ネットワーク I/O を置かない (updater check 等は遅延発火)。

機械検出: `startup.spec.ts` の release 実行を CI hard gate に。 frontend 計測を加えた段階内訳を回帰検出に使う。

## 横展開

調査で判明した同型の「キャッシュ無し cold walk + sync 再帰」 を exe scan と同方式で audit:

- `cmd_list_files` (File Search、 `file_search_commands.rs:12`)
- `cmd_scan_script_folder` (`script_commands.rs:11`)
- `cmd_auto_register_folder_items` (`item_service.rs:316` — audit W-9 で DB lock 保持中 walk も指摘)

これらもキャッシュ無し。 前回 Workspace 表示 user で複数 watch widget があれば mount 時に並列 walk し起動体感を悪化させる。 本 PH では exe scan を確実にキャッシュ化し、 残りは棚卸し表に寄与度を記録 (大きければ本 PH で、 小さければ別 PR)。

## 工数感

| Task                                             | 工数   |
| ------------------------------------------------ | ------ |
| 寄与要因の棚卸し + frontend 計測 instrumentation | 2-3 日 |
| release build 計測 + perf-budgets doc 更新       | 1 日   |
| 寄与要因ごとの改善 (計測結果次第)                | 3-5 日 |
| exe scan キャッシュ化                            | 3-4 日 |
| release CI gate 化                               | 1 日   |

合計: 約 2-3 週間 (改善タスクは棚卸し結果で変動)。

## 依存・着手順

- **先行**: なし。 ただし §タスク 4 (exe scan キャッシュ化) は PH-CF-400 完了後に着手 (再設計後の scanner に載せる。 旧 scanner に載せると 400 で作り直しになる)
- **段階内**: タスク 1 (棚卸し + 計測) → タスク 2 (release 計測) を先に通し、 寄与度が分かってからタスク 3 (改善) に入る。 タスク 4 は PH-CF-400 完了を待って並行
- **後続**: なし

## 参照

- `src-tauri/src/lib.rs:77-80, 111-353` (setup、 `perf:startup` log の 4 段階: `:114, :209, :247, :346`)
- `src/routes/+layout.svelte:52, 66-69` / `src/routes/+page.svelte:37-38, 51-56, 60, 71` (frontend 起動処理)
- `src-tauri/src/services/exe_scanner_service.rs:64-169` (`walk`)
- `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:153-204` (`$effect`)
- `tests/perf/startup.spec.ts` (D1/D2 計測、 `ARCAGATE_TEST_EXE` で release binary 指定可)
- `docs/l3_phases/paid-quality/audit/perf-budgets-2026-05-22.md` (D1/D2 debug 参考値)
- `docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` (W-2 / W-9)
  </content>
