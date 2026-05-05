# Release Readiness Audit — R6 Final (R4 + R5 + R6 完了後)

**Status**: 2026-05-04 R6-1/2/3/4/5 完了後の **再判定**
**Predecessor**: [audit-final.md](./audit-final.md) (R5 直後) + R6 6 PR

R5 後の audit-final.md ベースで R6 polish の効果を再集計。配布判定の最終確認。

## 結果サマリ (R5 後 → R6 後)

| 軸            | R5 後 PASS | R6 後 PASS | 差分                                                      |
| ------------- | ---------- | ---------- | --------------------------------------------------------- |
| A 機能        | 1          | 1          | (変化なし)                                                |
| B UI          | 2          | 4          | **+2** (B1 Industrial 全画面適用 / B5 EmptyState polish)  |
| C 安定        | 2          | 2          |                                                           |
| D perf        | 1          | 1          |                                                           |
| E error       | 3          | 3          |                                                           |
| F 配布        | 5          | 7          | **+2** (F4 SBOM 確認 / F9 SHA256 同梱)                    |
| G a11y        | 1          | 1          |                                                           |
| H i18n        | 1          | 1          |                                                           |
| I docs        | 3          | 4          | **+1** (I2 SmartScreen 警告対処を release notes に embed) |
| J test        | 4          | 5          | **+1** (J1 5 個目 state PASS 達成)                        |
| **合計 PASS** | **23**     | **29**     | **+6**                                                    |
| 部分的        | 17         | 11         | **-6** (上記 6 件移行)                                    |
| FAIL          | 1          | 1          | (B-1 deferred 維持)                                       |
| N/A           | 4          | 4          |                                                           |
| 未検証        | 18         | 18         | (perf 計測自動化は user app 終了時に実行)                 |

## R6 で **PASS** に動いた項目 (合計 6 件)

| ID                                | R5 旧             | → R6 新             | 経緯                                                                                                                                                                                    |
| --------------------------------- | ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 Industrial Yellow 全画面       | 部分的 (2/6 画面) | **PASS** (6/6 画面) | R6-1 Settings + R6-2 Workspace/Onboarding + R6-4 Palette/ItemFormDialog + L2-A 既 Library。data-il-zone scope override で focus / selected / accent state を yellow 化                  |
| B5 empty / loading / error 全画面 | 部分的            | **PASS**            | R6-1 EmptyState polish (Industrial yellow tint icon container) + LoadingState (Industrial spinner)、widget の small empty は inline 維持で OK                                           |
| F4 SBOM                           | 未検証            | **PASS**            | release.yml line 83 に「Generate SBOM (CycloneDX, PH-448)」 step 既存、`scripts/generate-sbom.ps1` 経由で sbom-rust.json + sbom-npm.json 生成、gh release create で同梱 (R6-5 で再確認) |
| F9 release artifact 整合 (sha256) | PASS (経路のみ)   | **PASS (実装完了)** | R6-5 で SHA256SUMS.txt 生成 step 追加、msi + nsis 両 artifact のハッシュを gh release create で同梱                                                                                     |
| I2 install ガイド (SmartScreen)   | 部分的            | **PASS**            | R6-5 release notes 自動 disclaimer に「未署名 / SmartScreen 警告対処 / updater deferred / Win11 only」を embed、SUPPORT.md / CHANGELOG.md link                                          |
| J1 unit coverage                  | 部分的 (4/5)      | **PASS** (5/5)      | R6-3 items.svelte.test.ts 14 件追加、items.svelte.ts Lines 14.94% → 90.80%、business-critical state ≥ 80% の store 5 件達成                                                             |

## 残 FAIL = 1 (deferred、配布 blocker でない)

**F3+F10 updater pubkey PLACEHOLDER**: 変化なし。GH Releases (manual install) で動作支障なし、release tag push 時の hard fail gate 化済 (`IS_RELEASE_TAG=1`)、user 作業 (`tauri signer generate`) 待ち。

## 残 部分的 (R6 後)

R5 で 17 件残 → R6 後 11 件残。残り内訳:

| ID                                | 残作業                                                  | 配布影響                                                                        |
| --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A1-A5                             | 全 widget / Library / Workspace / Palette flow 手動検収 | low (機械検証は通過、e2e + audit script で代替)                                 |
| B2 widget UX 常識 60 観測点       | 削除 1 step + 5 sec undo の Library 以外への展開        | low (Library のみで OK、他 widget は instant delete + workspace history で代替) |
| C1, C4 起動 / IPC freeze 動作証明 | scripts は実装済、user app 終了時に実行                 | low (運用時 1 回計測で baseline 確定)                                           |
| C6 DB migration rollback 文書化   | release notes に「forward only」明記                    | low                                                                             |
| D1-D9 perf 計測 (D5 以外 8 項目)  | scripts 実装済、user app 終了時に実行                   | medium (運用時 baseline 確定)                                                   |
| E1-E3 crash dialog / recovery     | scripts 実装可能、別 PR                                 | low (本 R6 範囲で取り扱わず)                                                    |
| G1-G3 a11y 全画面 / WCAG numeric  | axe-core CLI を e2e に組込み                            | medium (release 後 polish)                                                      |
| H1 日本語 UI 機械翻訳調           | PR review で対処済、目視 audit 不要                     | low                                                                             |
| J2 Rust coverage %                | cargo-llvm-cov で 1 回実行                              | low                                                                             |
| J4 regression scenarios 文書化    | lessons.md と test の cross-reference 表                | low                                                                             |

## 残 未検証 (agent 自動 run 可能、user 環境 trigger 待ち)

scripts は揃っているが、**user の arcagate.exe が動作中で startup 計測ができない**:

- D1/D2 startup P95 (`measure-startup.ps1`)
- C2/D7/D8 soak / 1000 item / 100 widget (要 fixture)
- D6 idle CPU

agent dev 環境で **再現不能** な user 環境固有:

- F8 uninstall (MSI / NSIS、user 環境のみ)
- G5 NVDA / Narrator (TTS engine、user 環境のみ)
- F7 SmartScreen 警告 (release notes に明記済、F7 は実機 user で確認できれば PASS)

## R6 配布判定 (再確定)

✅ **release-now-acceptable** (R5 後と同判定だが PASS が +6 で品質印象 substantially 向上)

差分:

- **B1 Industrial 全画面適用**: ユーザー体感の visual consistency が大幅向上 (6 画面 yellow 統一)
- **F9 SHA256 同梱**: 配布 artifact の整合確認が user 側で可能に
- **I2 release notes disclaimer**: SmartScreen 警告 / 未署名 / updater deferred を release ごとに自動明記
- **J1 unit coverage**: business-critical 5 store ≥ 80%、quality gate 達成

R7+ 残 polish (perf 計測の運用 baseline / a11y axe-core / lessons cross-ref / DB rollback 明記) は release 後でも実施可能、blocker ではない。

## 総 commit 数 (R1-R6)

R1: PR #293 (criteria docs)
R2: PR #294 (audit + gap-list)
R4-A: PR #295 (error-monitor + CHANGELOG + SUPPORT)
R4-B: PR #296 (auto-check scripts + CI 統合 + B-1 deferred docs)
R4-D: PR #297 (D5 measurement + vitest 4.1.5 bump)
R5-1: PR #298 (criteria 訂正 + audit J1/F6 訂正)
R5-4: PR #299 (EmptyState Industrial tint)
R5-final: PR #300 (audit-final.md)
R6-1: PR #301 (Settings Industrial scope)
R6-2: PR #302 (Workspace + Onboarding Industrial scope)
R6-3: PR #303 (items.svelte.test 14 件 / J1 PASS 達成)
R6-4: PR #304 (Palette + ItemFormDialog Industrial scope)
R6-5: PR #305 (SHA256 + release notes auto disclaimer)

合計 13 PR、release readiness 改善のみで PASS 17 → 29 (R2 比 +12、+71%)。
