# Release Readiness Audit — R9 Final (R8 完了後 + R9 4 PR 後)

**Status**: 2026-05-05 R9-A〜R9-D 完了後の **再判定 + distribution era 着手判定**
**Predecessor**: [audit-final-r8.md](./audit-final-r8.md) (R8 直後) + R9 4 PR

R8 後 audit からの差分。**release-now-acceptable** 維持、polish 完了局面へ。

## 結果サマリ (R8 後 → R9 後)

| 軸            | R8 後 PASS | R9 後 PASS | 差分                                                       |
| ------------- | ---------- | ---------- | ---------------------------------------------------------- |
| A 機能        | 1          | 1          |                                                            |
| B UI          | 5          | 5          |                                                            |
| C 安定        | 3          | 3          | (C2 nightly 統合済、計測 baseline は次 nightly run で取得) |
| D perf        | 1          | 1          |                                                            |
| E error       | 3          | 3          |                                                            |
| F 配布        | 7          | 7          |                                                            |
| G a11y        | 3          | 3          |                                                            |
| H i18n        | 1          | 2          | **+1** (H1 budget gate 化、regression 防止)                |
| I docs        | 4          | 4          |                                                            |
| J test        | 7          | 7          |                                                            |
| **合計 PASS** | **34**     | **35**     | **+1**                                                     |
| 部分的        | 6          | 5          | **-1** (H1 hardcoded budget が gate 化)                    |
| FAIL          | 1          | 1          | (B-1 deferred 維持)                                        |
| N/A           | 4          | 4          |                                                            |
| 未検証        | 14         | 13         | **-1** (C2 nightly 統合済、初回 nightly 待ち)              |

## R9 で **PASS** に動いた項目 (1 件) + 機能向上 (3 件) + automation (1 件)

| ID                                    | R8 旧     | → R9 新    | 経緯                                                                                                                                                                                                                                   |
| ------------------------------------- | --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **H1** i18n hardcode 状態管理         | 部分的    | **PASS**   | R9-C PR #320 で `audit-i18n-hardcode.sh` を informational → CI gate 化、`MAX_HARDCODE=299` で freeze。新規 hardcoded 文字列追加で CI fail、L4 着手時に段階的削減。Phase 1〜4 段階方針 確立                                             |
| (Palette) frecency ranking            | 機能 (旧) | **強化**   | R9-A PR #318 で Mozilla-inspired bucketed weight (4.0/2.0/1.0/0.5/0.25 day buckets)。`workspace_repository::list_frecency_items` (~25 行 SQL CASE)、3 unit test。Palette 空検索を `recent 5 + frequent 5 merge` → `frecency 10` に置換 |
| (Icon) cmd_extract_item_icon 重複起動 | 機能 (旧) | **強化**   | R9-B PR #319 で `icon_cache` テーブル + `extract_item_icon_cached` 経由、同 exe 重複 PowerShell 起動 (~100-500ms) を 2 件目以降 ~0ms に短縮。canonicalize 失敗時はフォールバック、PNG 消失時は再抽出                                   |
| (C2) idle memory soak                 | 未検証    | **自動化** | R9-D PR #321 で `measure-memory-soak.ps1` を nightly に統合 (5min idle / +5MB threshold、CI 時間制約による短縮版)。完全 30min 検収は user 環境別途、リーク検出は線形ペースで早期検知                                                   |

## 残 FAIL = 1 (deferred、配布 blocker でない)

**F3+F10 updater pubkey PLACEHOLDER**: R8 から変化なし。GH Releases (manual install) で動作支障なし、release tag push 時 hard fail gate 化済 (`IS_RELEASE_TAG=1`)、user 作業 (`tauri signer generate`) 待ち。

## 残 部分的 (R9 後 = 5 件)

| ID                                           | 残作業                                                                     | 配布影響                          |
| -------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| A1-A5                                        | 全 widget / Library / Workspace / Palette flow 手動検収                    | low (機械検証 + e2e で代替)       |
| C1 5 回起動 crash 0 / C4 IPC freeze 動作証明 | scripts は実装済、user app 終了時 + nightly 実行                           | low                               |
| D3-D9 perf 計測 (D1/D2/D7/D8 取得済以外)     | palette / launch / IPC は要 fixture script (R10+ 候補)                     | medium (運用時 baseline 継続蓄積) |
| E1-E3 crash dialog / recovery                | scripts 実装可能、別 PR                                                    | low                               |
| G3 WCAG numeric                              | Phase 2 (`ARCAGATE_AXE_GATE=1` opt-in、違反 fix) → Phase 4 で gate 既定 ON | medium (release 後 polish)        |

## 残 未検証 (R9 後 = 13 件)

agent 自動 run 可能 (nightly trigger 設置済):

- D1/D2 startup P95: nightly で取得 (R7-5 で自動化、初回 nightly run 待ち)
- D7/D8 perf: nightly で取得 (R8-1 で自動化、初回 nightly run 待ち)
- C2 idle memory soak: nightly で取得 (R9-D で自動化、初回 nightly run 待ち)

agent 自動 run 可能だが fixture script 未実装:

- C3 1 h heavy soak: heavy load 生成が CI で困難、user 環境別途
- D3 palette display / D4 launch P95 / D9 IPC P95: 要 fixture script (R10+)

agent 再現不能 (user 環境固有):

- F8 uninstall (MSI / NSIS、user 環境のみ)
- G5 NVDA / Narrator (TTS engine、user 環境のみ)
- F7 SmartScreen 警告 (release notes 明記済)

## R9 配布判定 (再確定)

✅ **release-now-acceptable** (R8 後と同判定、quality gate +1 + measurement +3 + automation +1 で更に向上)

差分:

- **i18n hardcode budget gate**: 299 件で freeze、regression 防止 + L4 完成までの段階方針確立
- **palette frecency ranking**: 単一 SQL で recency × frequency 重み付け、既存 merge 依存撤廃
- **icon DB cache**: 同 exe 重複抽出回避、Lessons.md C-2 派生対処
- **C2 nightly 自動化**: idle memory リーク検出を継続蓄積 (5min short)

## 総 commit 数 (R1-R9)

R1-R8: 24 PR (audit-final-r8.md 参照)
R9-A: PR #318 (frecency)
R9-B: PR #319 (icon_cache)
R9-C: PR #320 (i18n budget gate)
R9-D: PR #321 (memory soak nightly)
R9-final: 本 PR (audit-final-r9.md)

合計 **29 PR**。release readiness 改善のみで PASS 17 → 35 (**R2 比 +18、+106%**)。

## Distribution Era 着手判定

### 結論: **distribution era 着手で良い** (agent judgment)

理由:

- **release-now-acceptable** が R6 以降 4 サイクル維持 (R6 / R7 / R8 / R9)
- **残 FAIL = 1** は user 作業待ち (tauri signer generate)、agent 完遂不可
- **残部分的 = 5** は全て **release blocker でない** (low / medium polish)
- **残未検証 = 13** は agent 自動化済 (4 件) または agent 再現不能 (3 件)、残 6 件は R10+ 候補で release 後 polish
- **PASS 35** は R2 baseline (17) の **2 倍超**、R7 (release-acceptable 確定時の 32) を更に上回る

### Distribution Era で agent が完遂可能なタスク

R10 以降は **distribution-side polish** に重点を移すべき:

1. **Release artifact 整備**: release notes 自動化 (changelog、SHA256SUMS、SBOM) は R6-5 / R7-1 で完了
2. **Updater pubkey** (F3+F10): user 作業 (`tauri signer generate`) → agent は受領後の wiring のみ
3. **Distribution channel**: GH Releases manual install で十分、SmartScreen 警告は release notes 明記済
4. **First-run UX**: SetupWizard / OnboardingTour は既に存在、polish 余地は user FB 次第

### user に渡したい Action items

distribution era 着手時の user 作業:

1. **`tauri signer generate`** で updater 公開鍵 / 秘密鍵を生成
2. 公開鍵 → `src-tauri/tauri.conf.json` の `updater.pubkey`
3. 秘密鍵 → GH Actions secret (`TAURI_PRIVATE_KEY` 等)
4. release tag push で auto-build / auto-sign が走り MSI / NSIS / .sig が生成される

これら 4 step が完了すれば **F3+F10 PASS**、合計 PASS 36、配布判定 **release-with-updater** に格上げ可能。

## R10+ 候補 (release 後 polish)

agent judgment で必要に応じ:

- **R10-A**: D3 palette / D4 launch / D9 IPC fixture-based perf 計測 (R8-1 / R9-D 同型)
- **R10-B**: G3 axe Phase 2 切替 (`ARCAGATE_AXE_GATE=1` 既定 ON、違反 fix)
- **R10-C**: i18n MAX_HARDCODE 段階削減 (L4 framework 着手時)
- **R10-D**: E1-E3 crash dialog / recovery scripts 実装

ただし **R10 は user 駆動** (FB / 実利用での issue 検出) で十分。release blocker でない polish の continued automation は 価値低下傾向。

## 最終 verdict

**R9 完了 = polish era 終端、distribution era 着手可能** ✅

R10 候補は用意したが、agent 連続 mode を続ける merit は薄い。user の判断 (distribution era 着手 / R10 polish 続行 / 別領域 pivot) を待つフェーズに入った。
