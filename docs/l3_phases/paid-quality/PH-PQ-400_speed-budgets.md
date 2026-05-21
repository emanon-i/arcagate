---
id: PH-PQ-400
status: planning
batch: paid-quality
type: 改善
era: Polish
parent: README.md
---

# PH-PQ-400: 速さ — 性能予算を全機能で enforce + 大規模 N 検証

## 問題

`vision.md` D1-D9 で **数値性能予算** は既に明文化済 (起動 P95 ≤ 1500ms / palette P95 ≤ 120ms / Library 1000 items 60fps 等)、 しかし「**測定が CI gate になっていない**」 のが現状の最大 gap。

### 現状 (fact 確認)

| Budget (vision.md)            | 目標                        | 計測手段 (現状)                                   | CI gate |
| ----------------------------- | --------------------------- | ------------------------------------------------- | ------- |
| D1 起動 P95 cold              | ≤ 1500ms                    | `scripts/release-checks/measure-startup.ps1` 手動 | ❌      |
| D2 起動 P95 warm              | ≤ 1000ms                    | 同上                                              | ❌      |
| D3 Palette 表示 P95           | ≤ 120ms                     | A5 「手動 stopwatch + CDP perf timeline」         | ❌      |
| D4 アイテム起動 P95           | ≤ 200ms                     | A5 同上                                           | ❌      |
| D5 idle memory                | ≤ 120MB                     | C2 30 min user 手動検証                           | ❌      |
| D6 idle CPU                   | ≤ 1%                        | (検証手段未整備)                                  | ❌      |
| D7 Library 1000 items 60fps   | scroll 60fps / sort ≤ 200ms | `library-perf.spec.ts:28` **ITEM_COUNT=117**      | ❌      |
| D8 Workspace 100 widget 60fps | 操作 ≤ 200ms                | (検証手段未整備)                                  | ❌      |
| D9 IPC P95                    | ≤ 100ms                     | (検証手段未整備)                                  | ❌      |

Library-perf spec は ITEM_COUNT=117 で freeze 問題 (PR #524) を再現できなかった (`feedback_perf_audit_before_measure.md` 2026-05-19 教訓: 「fixture+warm 計測のため再現できなかった」)。 **実環境スケールに合った計測がない**。

PowerToys 0.93 が AOT compile で速くなって以来、 Windows launcher の起動速度競争は激化 ([PowerToys Command Palette 0.93 comparison](https://windowsforum.com/threads/powertoys-command-palette-0-93-fast-sleek-windows-launcher-vs-flow-raycast.378624/))。 Arcagate も「**毎回 1.5 秒以下で起動**」 を保てなければ paid 価値が伝わらない。

### 既往の wasteful processing 履歴

- W-1〜W-10 (`WASTEFUL_PROCESSING_AUDIT_2026-05-19.md`) で DB lock 中 fs walk / poll 間隔 / icon eager load 等の無駄処理を一掃済
- ただし 「規模 N が増えた時に再発するか」 の **regression gate** がない

## スコープ

1. **D1-D9 全予算の自動測定 fixture** を 1 件ずつ整備、 PR gate に組み込み
2. **Library を 117 → 1000 / 5000 / 10000 items でテスト**、 freeze なきこと verify
3. **必要なら virtualization 導入** (`@humanspeak/svelte-virtual-list` or `virtua` 等で 60fps 維持)
4. **Workspace を 100 widget 配置でテスト** (D8 release-criteria)
5. **IPC P95 100ms gate** (現存 98 commands を CI で計測)
6. **重い I/O は全部 background** (現状 `spawn_blocking` 22 件、 漏れ audit)
7. **起動経路の cold/warm 分離計測** + AOT/lazy import の見直し

## やらないこと

- Rust 全 file の SIMD 最適化 / 単一 hot loop 改善 (paid 体感に影響なし)
- WebView2 自体の差し替え (Edge Chromium 一択、 変えられない)
- SQLite → 別 DB (Non-goal、 foundation 確定)
- Connection Pool 導入 (foundation §1 「Mutex<Connection> + WAL で十分」 確定)

## 具体タスク

### T1. 性能予算 fixture 自動化 (D1-D9 を CI gate へ)

`tests/perf/` (新規 dir) に各予算の自動計測 spec を新設:

| Spec file                | 計測対象                            | 閾値                          |
| ------------------------ | ----------------------------------- | ----------------------------- |
| `startup-cold.spec.ts`   | first launch (DB 削除後)            | P95 ≤ 1500ms                  |
| `startup-warm.spec.ts`   | 2nd launch                          | P95 ≤ 1000ms                  |
| `palette-open.spec.ts`   | Ctrl+Shift+Space → DOM 描画完了     | P95 ≤ 120ms                   |
| `launch-latency.spec.ts` | item Enter → IPC 完了               | P95 ≤ 200ms                   |
| `library-1000.spec.ts`   | 1000 item で scroll / sort / filter | scroll 60fps / sort ≤ 200ms   |
| `library-5000.spec.ts`   | 5000 item で同上 (stress)           | scroll ≥ 50fps / sort ≤ 500ms |
| `workspace-100.spec.ts`  | 100 widget 配置                     | 操作応答 ≤ 200ms / 50fps      |
| `ipc-latency.spec.ts`    | 主要 IPC 20 command × 100 call      | 各 P95 ≤ 100ms                |
| `idle-cpu.spec.ts`       | 30 sec idle で CPU%                 | ≤ 1%                          |

各 spec は CDP Performance API + Tauri IPC timer で計測、 結果を `tests/perf/results.json` に書き出し、 閾値超過で fail。

CI 統合: `.github/workflows/perf.yml` 新規 (cron `0 21 * * *` JST 06:00、 nightly)。 PR では skip (paid 体感は別 spec で軽量 check)、 main push 時のみ full run。

### T2. Library 1000 / 5000 / 10000 fixture

既存 `tests/e2e/library-perf.spec.ts:28 ITEM_COUNT=117` を以下に拡張:

- `library-perf-117.spec.ts` (現状維持、 体感ベンチ用)
- `library-perf-1000.spec.ts` (D7 検証、 fixture 生成は warm cache 排除して計測)
- `library-perf-5000.spec.ts` (stress、 fixture は CI で生成、 nightly only)
- `library-perf-10000.spec.ts` (worst case ベンチ、 stress、 nightly only)

fixture 生成 (`buildFolderFixture` 拡張、 `library-perf.spec.ts:30` `BIG_DIRS=4×4000`) は scale 別に分離。 1000+ では DEFAULT 計測 + cold cache (`PRAGMA reset` + WebView2 cache clear) を mode で切替。

### T3. Library virtualization 導入判断

T2 で 1000 item で freeze が出るなら virtualization を導入:

- 候補: `@humanspeak/svelte-virtual-list` (Svelte 5 対応、 dynamic height、 fact 確認済) / `virtua` (3kB、 multi-framework) / `TanStack Virtual` (framework agnostic 60fps claim)
- 適用箇所: `src/lib/components/arcagate/library/LibraryMainArea.svelte:436` (Library grid)
- grid layout (CSS grid) との互換性確認、 既存 `LibraryView.svelte:333` の card sort/filter 経路と干渉なきこと
- 既存 `audit-no-horizontal-scrollbar.sh` (`scripts/`) 等の audit と回帰なきこと

判断基準: T2 計測で 1000 item で **frame rate < 50fps** または **sort > 200ms** なら virtualization 採用。 数値で判断 (`feedback_perf_audit_before_measure.md` 教訓「実測から始めず処理棚卸し」 を遵守 = まず実測、 数値が出てから対処)。

### T4. Workspace 100 widget 検証 + virtualization

D8 「Workspace 100 widget でフリーズ無し」 の検証 spec を新設。 Workspace は grid layout (`src/lib/components/arcagate/workspace/WorkspaceGrid.svelte:407`) で 100 widget mount すると DOM ~10k node 規模。

- T2 と同じ判断: 50fps 未満なら viewport virtualization (画面外 widget を unmount、 zoom 状態を意識)
- 既存 `src/lib/state/widget-zoom.svelte.ts:252` の zoom 計算 perf も同時 verify

### T5. IPC P95 100ms gate

`tests/perf/ipc-latency.spec.ts` で主要 IPC 20 command を **100 回ずつ叩く**、 P95 を assert:

| Command                         | 期待 P95                             |
| ------------------------------- | ------------------------------------ |
| `cmd_list_items`                | ≤ 100ms (1000 items)                 |
| `cmd_get_items_metadata_batch`  | ≤ 500ms (1000 items batch)           |
| `cmd_search_items`              | ≤ 80ms (fuzzy match)                 |
| `cmd_launch_item`               | ≤ 200ms (spawn 除く Arcagate 側のみ) |
| `cmd_get_workspaces`            | ≤ 50ms                               |
| `cmd_get_widgets_for_workspace` | ≤ 50ms                               |
| `cmd_palette_search`            | ≤ 80ms                               |
| (...計 20 件、 spec で列挙)     |                                      |

`src-tauri/src/services/launch_service.rs:49-65` (W-1 で DB lock 短縮済) のパターンを他 service にも横展開、 「DB lock の中で I/O しない」 を再度 sweep。

### T6. 重い I/O は全部 background

現状 `spawn_blocking` 22 件 (Codex fact 確認)。 漏れがないか以下を audit:

- file system walk (`auto_register_folder_items` `src-tauri/src/services/item_service.rs:316` は対処済 W-9)
- icon 抽出 (`extract_item_icon` `item_service.rs:561`)
- HTTP fetch (updater check / metadata)
- migration (起動時、 ただし 1 度のみで OK)

新規 audit script: `scripts/audit-blocking-on-runtime.sh` を新設、 `#[tauri::command]` 内で `std::fs::*` / `std::process::*` を直接呼んでいる箇所を grep で検出 (false-positive を allow-list で除外)。 CI で 0 violations を gate。

### T7. 起動経路 cold/warm 分離 + lazy import 見直し

- `src-tauri/src/lib.rs:120-220` (setup) の各 step を `log::info!(target: "perf:startup", "step={} took={}ms", ...)` で計測
- 重い service init (theme_service / metadata_service) を deferred init へ (UI 表示後に lazy load)
- Frontend では `$effect` での lazy data fetch を見直し、 `src/lib/state/metadata.svelte.ts:42-63` の batch dedup を **first paint 後** に遅延

cold startup 1500ms gate で割り振り:

| 段階                        | 予算         |
| --------------------------- | ------------ |
| Tauri Builder + plugin init | ≤ 300ms      |
| DB open + migration check   | ≤ 200ms      |
| frontend bundle load        | ≤ 500ms      |
| frontend first paint        | ≤ 500ms      |
| 計 (cold P95)               | **≤ 1500ms** |

## 受け入れ条件

- [ ] T1 perf spec 9 件すべて threshold 内で pass
- [ ] T2 Library 1000 item / 5000 / 10000 fixture が CI で nightly run、 結果 JSON が artifact 化
- [ ] T3 1000 item で virtualization 採用判断が doc 化 (採用なら実装 + before/after 計測 / 不採用なら数値根拠)
- [ ] T4 Workspace 100 widget で 50fps 維持
- [ ] T5 IPC 20 command すべて P95 ≤ 100ms (1000 batch は ≤ 500ms)
- [ ] T6 新規 audit script で 0 violations
- [ ] T7 cold startup 段階予算が各 step ≤ threshold、 合計 ≤ 1500ms
- [ ] perf regression PR で fail → main push gate (`.github/workflows/perf.yml` 統合)

## 工数感

| Task                          | 工数            | 依存        |
| ----------------------------- | --------------- | ----------- |
| T1 perf fixture 9 spec        | 4-5 日          | PQ-100 完了 |
| T2 Library scale fixture      | 2-3 日          | T1          |
| T3 virtualization 判断 + 実装 | 2-4 日 (採用時) | T2          |
| T4 Workspace 100 widget       | 1-2 日          | T1          |
| T5 IPC P95 gate               | 2 日            | T1          |
| T6 blocking-on-runtime audit  | 1 日            | —           |
| T7 cold/warm startup 分離     | 2-3 日          | —           |
| 合計                          | **2-3 週間**    |             |

## 依存・着手順

1. **先行**: PQ-100 完了 (panic-clean な base) / PQ-300 完了 (axe + craft sweep) — perf 改善で UI structure 変更しても a11y regression なきこと verify
2. **並行可**: PQ-700 i18n (perf には影響なし)
3. **後続**: PQ-500 / PQ-600 が本 phase の予算を維持

## 横展開チェック

- 新規 audit script (`audit-blocking-on-runtime.sh`) は `lefthook.yml` の `audit:all` step に追加
- perf workflow 失敗時の auto-issue open は PQ-100 T5 soak と同一機構を採用
- T2 fixture サイズ大 (10000 item × icon 各 11KB = 約 110MB) は CI runner disk で OK だが、 nightly only に限定

## 参照

- 性能予算: [`docs/l1_requirements/vision.md`](../../l1_requirements/vision.md) D1-D9
- 既存 perf 計測: `scripts/release-checks/measure-startup.ps1` / `scripts/release-checks/measure-memory-soak.ps1` / `scripts/bench/*.ps1`
- 既存 Library-perf spec: `tests/e2e/library-perf.spec.ts:1-30`
- Wasteful processing: [`docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md`](../audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md)
- Perf lessons: [`memory/feedback_perf_audit_before_measure.md`](../../../.claude/memory/feedback_perf_audit_before_measure.md) (2026-05-19 確定)
- Svelte 5 virtualization 候補: [@humanspeak/svelte-virtual-list](https://www.npmjs.com/package/@humanspeak/svelte-virtual-list) / [virtua](https://github.com/inokawa/virtua) / [TanStack Virtual](https://tanstack.com/virtual/latest)
- 競合 perf: [PowerToys 0.93 AOT comparison](https://windowsforum.com/threads/powertoys-command-palette-0-93-fast-sleek-windows-launcher-vs-flow-raycast.378624/)
- 値踏み: [PRODUCT_VALUATION_CODEX §4 安定性](../../../.claude/worktrees/gracious-leakey-504c9c/docs/l3_phases/audit/PRODUCT_VALUATION_CODEX_2026-05-21.md)
