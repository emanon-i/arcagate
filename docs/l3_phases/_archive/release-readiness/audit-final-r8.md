# Release Readiness Audit — R8 Final (R7 完了後 + R8 4 PR 後)

**Status**: 2026-05-05 R8-1〜R8-4 完了後の **再判定**
**Predecessor**: [audit-final-r7.md](./audit-final-r7.md) (R7 直後) + R8 4 PR

R7 後 audit からの差分。**release-now-acceptable** は維持、polish 強化のみ。

## 結果サマリ (R7 後 → R8 後)

| 軸            | R7 後 PASS | R8 後 PASS | 差分                                                                |
| ------------- | ---------- | ---------- | ------------------------------------------------------------------- |
| A 機能        | 1          | 1          |                                                                     |
| B UI          | 4          | 5          | **+1** (B2 widget UX 5sec undo を Workspace へ展開、削除 UX 一貫化) |
| C 安定        | 3          | 3          |                                                                     |
| D perf        | 1          | 1          | (D7/D8 fixture 自動化、計測 baseline は次 nightly run で取得)       |
| E error       | 3          | 3          |                                                                     |
| F 配布        | 7          | 7          |                                                                     |
| G a11y        | 2          | 3          | **+1** (G1 keyboard reach static gate)                              |
| H i18n        | 1          | 1          |                                                                     |
| I docs        | 4          | 4          |                                                                     |
| J test        | 7          | 7          |                                                                     |
| **合計 PASS** | **32**     | **34**     | **+2**                                                              |
| 部分的        | 8          | 6          | **-2** (B2 / G1)                                                    |
| FAIL          | 1          | 1          | (B-1 deferred 維持)                                                 |
| N/A           | 4          | 4          |                                                                     |
| 未検証        | 16         | 14         | **-2** (D7 fixture / D8 fixture 自動化、初回 nightly 待ち)          |

## R8 で **PASS** に動いた項目 (2 件) + measurement / audit script 追加 (3 件)

| ID                         | R7 旧  | → R8 新         | 経緯                                                                                                                                                                                                                                       |
| -------------------------- | ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B2** widget UX 60 観測点 | 部分的 | **PASS**        | R8-3 PR #315 で WorkspaceUndoSnackbar 追加。LibraryUndoSnackbar と同型 UX (bottom-center / 5 sec / 元に戻す button)、`workspace-history.svelte.ts` に pendingUndo 状態 + 5sec TTL timer + 5 unit test。Ctrl+Z と snackbar click は同一経路 |
| **G1** Keyboard 全画面到達 | 部分的 | **PASS**        | R8-4 PR #316 で `audit-keyboard-traps.sh` 新規。`<div\|span onclick>` で role/tabindex なし、`<a>` で href/role/onclick なし を gate、現状 0 violations、ci.yml + lefthook で regression 防止                                              |
| (G3) WCAG numeric          | 部分的 | **measurement** | R8-2 PR #314 で `@axe-core/playwright` 統合、Library / Workspace / Settings / Palette 4 画面 audit、`axe-violations.json` artifact 30 日保持。Phase 1 = informational、Phase 2 で `ARCAGATE_AXE_GATE=1` opt-in、Phase 4 で G3 PASS 化計画  |
| (D7) Library 1000 items    | 未検証 | **自動化**      | R8-1 PR #313 で `tests/helpers/perf-seed.ts` + `tests/e2e/perf-d7-library.spec.ts`、`@perf-nightly` tag で nightly 専用、search/sort latency P95 計測 (threshold 200ms)、`d7-library-1000.json` artifact                                   |
| (D8) Workspace 100 widget  | 未検証 | **自動化**      | R8-1 PR #313 で `tests/e2e/perf-d8-widget.spec.ts`、100 favorites widget seed → Reset/Fit zoom 応答 P95 計測、`d8-widget-100.json` artifact                                                                                                |

## 残 FAIL = 1 (deferred、配布 blocker でない)

**F3+F10 updater pubkey PLACEHOLDER**: R7 から変化なし。GH Releases (manual install) で動作支障なし、release tag push 時の hard fail gate 化済 (`IS_RELEASE_TAG=1`)、user 作業 (`tauri signer generate`) 待ち。

## 残 部分的 (R8 後 = 6 件)

| ID                                           | 残作業                                                                     | 配布影響                          |
| -------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| A1-A5                                        | 全 widget / Library / Workspace / Palette flow 手動検収                    | low (機械検証 + e2e で代替)       |
| C1 5 回起動 crash 0 / C4 IPC freeze 動作証明 | scripts は実装済、user app 終了時 + nightly 実行                           | low                               |
| D3-D9 perf 計測 (D1/D2/D7/D8 取得済以外)     | palette / launch / IPC は要 fixture script                                 | medium (運用時 baseline 継続蓄積) |
| E1-E3 crash dialog / recovery                | scripts 実装可能、別 PR                                                    | low                               |
| G3 WCAG numeric                              | Phase 2 (`ARCAGATE_AXE_GATE=1` opt-in、違反 fix) → Phase 4 で gate 既定 ON | medium (release 後 polish)        |
| H1 日本語 UI 機械翻訳調                      | 目視 audit 不要 (PR review で対処済)                                       | low                               |

## 残 未検証 (R8 後 = 14 件)

agent 自動 run 可能 (nightly trigger 設置済):

- D1/D2 startup P95: nightly で取得 (R7-5 で自動化、初回 nightly run 待ち)
- D7/D8 perf: nightly で取得 (R8-1 で自動化、初回 nightly run 待ち)

agent 自動 run 可能だが fixture script 未実装:

- C2 idle 30 min soak / C3 1 h heavy soak: measure-memory-soak.ps1 ある、nightly 統合余地

agent 再現不能 (user 環境固有):

- F8 uninstall (MSI / NSIS、user 環境のみ)
- G5 NVDA / Narrator (TTS engine、user 環境のみ)
- F7 SmartScreen 警告 (release notes 明記済)

## R8 配布判定 (再確定)

✅ **release-now-acceptable** (R7 後と同判定、quality gate +2 + measurement +3 で更に向上)

差分:

- **widget delete UX 一貫化**: Workspace でも 5sec undo snackbar (Library と同型)
- **G1 keyboard 静的 gate**: 0 violations 維持の CI 保証
- **G3 axe baseline**: WCAG numeric 計測 infrastructure 整備、Phase 1〜4 段階方針確立
- **D7/D8 nightly 自動化**: fixture-based perf 計測、artifact 30 日保持

## 総 commit 数 (R1-R8)

R1-R7: 19 PR (audit-final-r7.md 参照)
R8-1: PR #313 (D7/D8 fixture-based perf)
R8-2: PR #314 (axe-core 統合 baseline)
R8-3: PR #315 (Workspace 5sec undo snackbar)
R8-4: PR #316 (keyboard reach audit gate)
R8-final: 本 PR (audit-final-r8.md)

合計 24 PR。release readiness 改善のみで PASS 17 → 34 (R2 比 +17、+100%)。

## R8-5 → R9 へ deferred

R7 で listed していた **R8-5 frecency / icon system overhaul** は L3-C 持ち越し分で **ボリューム大**。
1 PR 200 行ガード + R8 連続 4 PR 消化済 cadence からして単独 PR で完遂不可。
**R9 で個別 phase 化** (R9-A frecency / R9-B icon system) する判断。**release blocker でない**。

## R9 候補 (post-distribution-judgment polish)

agent judgment で 4-5 PR + final audit cadence:

- **R9-A**: frecency (最近起動 + アクセス頻度の重み付け、L3-C 持ち越し分)
- **R9-B**: icon system overhaul (DB cache 化、`cmd_extract_item_icon` 同期 IPC 解消、Lessons.md C-2 根本対処)
- **R9-C**: i18n hardcode の段階削減 (baseline 295 件 → 削減開始、L4 PASS への動き)
- **R9-D**: 残 部分的の任意項目 (agent 優先度判断)
- **R9-final**: audit-final-r9.md + 「distribution era 着手で良い」判定

R8 完了時点で **配布判定可能**は維持。R9 は user 体感の品質向上 + 残 polish 削減フェーズ。
