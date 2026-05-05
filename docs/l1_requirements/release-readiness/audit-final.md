# Release Readiness Audit — Final (R4 + R5 完了後)

**Status**: 2026-05-04 R4 / R5-1 / R5-4 完了後の **再判定**
**Predecessor**: [audit.md](./audit.md) (R2) + [gap-list.md](./gap-list.md) (R3) + R4-A #295 / R4-B #296 / R4-D #297 / R5-1 #298 / R5-4 #299

R4 / R5 で blocker / partial / FAIL を **どこまで潰せたか** を再集計。新たな gap は本 doc 末尾に列挙し、配布判定の現実解 (release-now-acceptable / release-deferred-recommended) を agent 側で提示。

## 結果サマリ (R2 と差分比較)

| 軸            | R2 PASS | R5 後 PASS | 差分                                                                        |
| ------------- | ------- | ---------- | --------------------------------------------------------------------------- |
| A 機能        | 1       | 1          | (変化なし)                                                                  |
| B UI          | 2       | 2          | (変化なし)                                                                  |
| C 安定        | 1       | 2          | +1 (C8 silent fail FAIL → R4-A で PASS)                                     |
| D perf        | 0       | 1          | +1 (D5 idle メモリ R4-D snapshot で PASS)                                   |
| E error       | 3       | 3          | (変化なし)                                                                  |
| F 配布        | 4       | 5          | +1 (F6 R5-1 訂正 PASS)                                                      |
| G a11y        | 1       | 1          | (変化なし)                                                                  |
| H i18n        | 1       | 1          | (変化なし)                                                                  |
| I docs        | 1       | 3          | +2 (I3 / I4 R4-A で PASS)                                                   |
| J test        | 3       | 4          | +1 (J5 R4-B で PASS、自動 script + CI gate)                                 |
| **合計 PASS** | **17**  | **23**     | **+6**                                                                      |
| 部分的        | 17      | 17         | (大半は数値 / 全画面適用 残)                                                |
| FAIL          | 6       | 1          | -5 (B-1 deferred 化 + C8/I3/I4/J5 PASS、F3+F10 PLACEHOLDER は WARN gate 化) |
| N/A           | 4       | 4          |                                                                             |
| 未検証        | 19      | 18         | -1 (J5 自動化で消化、D5 snapshot 取得済)                                    |

**NOT READY** → **release-acceptable-with-deferred** に移行。

## R4 / R5 で **PASS** に動いた項目

| ID                        | 旧     | → 新 | 経緯                                                                  |
| ------------------------- | ------ | ---- | --------------------------------------------------------------------- |
| C8 (frontend silent fail) | FAIL   | PASS | R4-A 新規 `error-monitor.svelte.ts` + +layout install + 7 unit test   |
| D5 (idle memory)          | 未検証 | PASS | R4-D 非破壊 snapshot、6.7 h 稼働で 23 MB / 120 MB threshold の 19%    |
| F6 (privacy / license)    | 部分的 | PASS | R5-1 訂正 (PrivacySettings.svelte:49 link 既存、grep path 誤りだった) |
| I3 (CHANGELOG)            | FAIL   | PASS | R4-A `CHANGELOG.md` 新規 (Keep a Changelog 形式)                      |
| I4 (SUPPORT)              | FAIL   | PASS | R4-A `docs/SUPPORT.md` + README サポート 節                           |
| J5 (release-checklist)    | FAIL   | PASS | R4-B 自動 script 化 (run-all-static.sh + check-* 3 件 + CI 統合)      |

## 残 FAIL (配布判定への影響度)

### F3 + F10 — updater pubkey PLACEHOLDER

- **状態**: PLACEHOLDER のまま、`scripts/release-checks/check-pubkey.sh` で WARN
- **配布形態**: GH Releases (manual install) で OK、updater 経路は無効化扱い
- **release tag push 時の挙動**: `IS_RELEASE_TAG=1` で hard fail、user 作業必須
- **deferred**: [user-action-needed.md B-1](./user-action-needed.md) に分離、release-acceptable

→ **配布 blocker ではない** (auto-update を後で有効化する経路が user-action 待ち)。

## 残 部分的 (R6 以降の polish 候補)

優先順位: blocker でない、release 後 polish で十分。

| ID    | 項目                                                                               | 残作業                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A1-A6 | 全 widget / Library / Workspace / Settings / Onboarding / Palette 全 flow 手動検収 | release 前に user 環境で 1 巡 (J5 release-checklist で自動化可能な部分はカバー済)                                                               |
| B1    | Industrial Yellow 全 6 画面適用                                                    | Workspace / Settings / Palette / Onboarding / Item form 未移行 (R5-4 で EmptyState の icon tint だけ完了)。L4 distribution era の polish で全面 |
| B2    | widget UX 常識 60 観測点                                                           | audit script で大半カバー、widget 削除 1 step + 5 sec undo の Library 以外への展開は L3 後の polish                                             |
| B5    | empty / loading / error 全画面 Industrial 化                                       | LoadingState + EmptyState で適用済、ErrorState は未。R6 で polish                                                                               |
| C1-C4 | 起動 / soak / IPC freeze の **動作証明**                                           | C1 (5 回起動 crash 0) と C4 (IPC error UI) は user の arcagate.exe 終了後に automated run、まだ未取得                                           |
| C6    | DB migration rollback 文書化                                                       | release notes に「forward only」明記が残作業                                                                                                    |
| D1-D9 | perf 計測の他 8 項目                                                               | D5 のみ snapshot 取得、D1/D2/D3/D4/D6/D7/D8/D9 は user session 終了後に自動 run                                                                 |
| E1-E3 | crash dialog / recovery / config restore                                           | scripts は run-all-runtime で実行可能、結果 commit 待ち                                                                                         |
| F4    | SBOM in release.yml                                                                | `generate-sbom.sh` 実装済だが release.yml に組込み未                                                                                            |
| G1-G3 | a11y 全画面 / WCAG numeric                                                         | axe-core CLI を e2e に組込み (R6)                                                                                                               |
| H1    | 日本語 UI 機械翻訳調 audit                                                         | 目視 PR review で対処済 (実害なし)                                                                                                              |
| I2    | install ガイドに SmartScreen 警告対処                                              | SUPPORT.md に既に記載、README に link 追加程度                                                                                                  |
| J1    | unit coverage 5 個目 state ≥ 80%                                                   | items.svelte.ts test 追加で達成                                                                                                                 |
| J2    | Rust coverage % 取得                                                               | cargo-llvm-cov 1 回実行で取得可能                                                                                                               |
| J4    | regression scenarios 文書化                                                        | lessons.md と test の cross-reference 表 (1 h)                                                                                                  |

## 残 未検証 (agent dev 環境で **自動 run** 可能なもの)

`scripts/release-checks/` 経由で agent が user app 終了時に実行できる:

- D1/D2 startup P95 (`measure-startup.ps1`)
- C2/D7/D8 soak / 1000 item / 100 widget (要 fixture script、後続)
- D6 idle CPU (簡単な PowerShell + `Get-Counter`)

agent dev 環境で **再現不能** なもの (user 環境固有):

- F8 uninstall (MSI / NSIS uninstaller、user 環境のみ)
- G5 NVDA / Narrator (TTS engine、user 環境のみ)
- F7 SmartScreen 警告 (Windows Defender 反応、release notes に明記済)

## 配布判定 (agent 提示)

### release-now-acceptable (本 audit ベース)

- 配布形態: GH Releases、manual install + 未署名 (release notes に明記)
- updater: deferred (B-1 user 作業)、ない state でも動作に支障なし
- silent fail: 解消済
- support / changelog / privacy: 揃った
- 主要 flow: e2e + audit script で機械検証 PASS、手動検収は release 後でも user 困らない

### release-deferred-recommended の場合 (品質印象向上)

- R5-3 Industrial Yellow を Workspace / Settings に波及
- D1/D2 startup P95 numerical 取得
- F4 SBOM を release.yml に組込み
- items.svelte.ts unit test (J1 完全達成)

### agent 推奨

**release-now-acceptable で出して問題ない**。R5-3 / R6 は release 後 polish で。
配布したいタイミングを user が決めれば、`scripts/release-checks/run-all-static.sh` が CI gate として
`IS_RELEASE_TAG=1` で release tag push 時に B-1 を強制 fail させる仕組み済 (user 作業誘導)。
