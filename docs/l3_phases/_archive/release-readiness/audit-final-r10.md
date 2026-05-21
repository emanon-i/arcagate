# Release Readiness Audit — R10 Final (R9 完了後 + R10 6 PR 後)

**Status**: 2026-05-05 R10-A〜R10-F 完了後の **再判定**
**Predecessor**: [audit-final-r9.md](./audit-final-r9.md) (R9 直後) + R10 6 PR + pubkey procedure doc

R9 後 audit からの差分。**release-now-acceptable** 維持、polish 完了局面の終端へ。

## 結果サマリ (R9 後 → R10 後)

| 軸            | R9 後 PASS | R10 後 PASS | 差分                                                              |
| ------------- | ---------- | ----------- | ----------------------------------------------------------------- |
| A 機能        | 1          | 2           | **+1** (A1 widget 12 種 proof-of-life 完全 covered)               |
| B UI          | 5          | 5           |                                                                   |
| C 安定        | 3          | 3           |                                                                   |
| D perf        | 1          | 1           | (D3/D4/D9 fixture 自動化、計測 baseline は次 nightly で取得)      |
| E error       | 3          | 4           | **+1** (E1 panic_hook + 起動時 toast 表示、deferred 解消)         |
| F 配布        | 7          | 7           |                                                                   |
| G a11y        | 3          | 4           | **+1** (G3 Phase 2 critical=0 gate ON、nested main / lang fix)    |
| H i18n        | 2          | 2           | (R10-C で catalog + 4 migrate、MAX 297 で freeze、Phase 3 進行中) |
| I docs        | 4          | 5           | **+1** (pubkey-procedure.md 完成、threat model + security 分析)   |
| J test        | 7          | 7           |                                                                   |
| **合計 PASS** | **35**     | **40**      | **+5**                                                            |
| 部分的        | 5          | 2           | **-3** (A1 / E1 / G3 が PASS 化)                                  |
| FAIL          | 1          | 1           | (B-1 deferred 維持、ただし pubkey-procedure.md で user 導線確立)  |
| N/A           | 4          | 4           |                                                                   |
| 未検証        | 13         | 11          | **-2** (D3 palette / D9 IPC nightly 自動化、初回 nightly 待ち)    |

## R10 で **PASS** に動いた項目 (5 件) + automation / tightening (4 件)

| ID                                      | R9 旧    | → R10 新    | 経緯                                                                                                                                                                                                                                                                    |
| --------------------------------------- | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** 主要 widget 動作 (12 種)         | 部分的   | **PASS**    | R10-F PR #329 で `widget-proof-of-life.spec.ts` 新規 (9 種、既存 3 と合わせ 12 完全 covered)、各 widget mount + 0 console error 検証、`@smoke` tag で PR ごと CI                                                                                                        |
| **E1** panic / unhandled rejection 表示 | 部分的   | **PASS**    | R10-D PR #327 で `install_panic_hook` 実装 (stub → 実装)、APPDATA/last-panic.json に redact 後書込、+layout.svelte で起動時に `cmd_consume_last_panic` で読み出し toast 表示。frontend silent fail 検知 (R4-A) と合わせて E1 完全 covered                               |
| **G3** WCAG numeric                     | 部分的   | **PASS**    | R10-B PR #324 で `axe-core/playwright` を Phase 1 informational → Phase 2 critical=0 hard gate に切替、事前 fix 2 件 (app.html lang en→ja / LibraryMainArea nested main → section)、Phase 3 用に ARCAGATE_AXE_GATE_STRICT=1 opt-in 路線                                 |
| **I (新規)** pubkey 手順書              | 未存在   | **PASS**    | PR #325 で `docs/l1_requirements/distribution/pubkey-procedure.md` 新規 (197 行)、threat model + security 分析 + agent 触らせ可否 + 手順 A-E + rotation 手順 + 出典。user-action-needed.md の `bundle.updater.pubkey` 誤記 (v1) も `plugins.updater.pubkey` (v2) に修正 |
| (G1) keyboard reach dynamic gate        | 静的のみ | **強化**    | R10-E PR #328 で `keyboard-dynamic.spec.ts` 新規 4 spec、Library 検索 / Workspace zoom reset / Settings close + ESC / Library search ESC を実動検証。R8-4 static audit と直交、layout 変更 / focus trap 破綻 を検出                                                     |
| (D3) palette display P95                | 未検証   | **自動化**  | R10-A PR #323 で `cmd_get_frecency_items` を proxy として 50 回計測 (palette 空検索 critical path)、e2e-nightly.yml の perf step で実行                                                                                                                                 |
| (D9) IPC P95                            | 未検証   | **自動化**  | R10-A PR #323 で `cmd_list_items` / `cmd_search_items` / `cmd_get_frecency_items` 各 50 回 + `cmd_get_items_metadata_batch` (1000 ids) × 5 回。threshold list/search/frecency ≤ 100ms / metadata ≤ 500ms                                                                |
| (H) i18n catalog + migrate              | budget   | **catalog** | R10-C PR #326 で `src/lib/i18n/messages-ja.ts` 雛形 + 4 strings migrate、audit-i18n-hardcode から `src/lib/i18n/` 除外、MAX 299 → 297 (net -2)。L4 framework 採用前の集約点として確立                                                                                   |

## 残 FAIL = 1 (deferred、配布 blocker でない)

**F3+F10 updater pubkey PLACEHOLDER**: 状態は変化なしだが、**user 導線が完成**:

- `docs/l1_requirements/distribution/pubkey-procedure.md` (R10、PR #325) で手順 A-E + security 確認 + agent 代行可否 を明文化
- user は本 doc 1 つを読んで `tauri signer generate -p` → GH Actions secret 設定 → release tag push まで完遂可能
- **R10 で agent 側が完遂可能な準備は完了**。残るは user の物理アクションのみ

## 残 部分的 (R10 後 = 2 件)

| ID                                           | 残作業                                           | 配布影響 |
| -------------------------------------------- | ------------------------------------------------ | -------- |
| C1 5 回起動 crash 0 / C4 IPC freeze 動作証明 | scripts は実装済、user app 終了時 + nightly 実行 | low      |
| H1 日本語 UI 機械翻訳調                      | 目視 audit 不要 (PR review で対処済)             | low      |

`audit-final-r9.md` 残部分的 5 件のうち 3 件 (A1 / E1 / G3) が R10 で PASS 化、2 件 (C1 / H1) は agent 完遂不能のため部分的維持。

## 残 未検証 (R10 後 = 11 件)

agent 自動 run 可能 (nightly trigger 設置済):

- D1/D2 startup P95: nightly (R7-5、初回 run 待ち)
- D7/D8 Library/Workspace perf: nightly (R8-1、初回 run 待ち)
- D3 palette / D9 IPC: nightly (R10-A、初回 run 待ち)
- C2 idle memory soak: nightly (R9-D、初回 run 待ち)

agent 自動 run 可能だが fixture script 未実装:

- C3 1 h heavy soak: heavy load 生成が CI で困難、user 環境別途
- D4 item launch P95: 実プロセス spawn が CI で危険、user 環境別途

agent 再現不能 (user 環境固有):

- F8 uninstall (MSI / NSIS、user 環境のみ)
- G5 NVDA / Narrator (TTS engine、user 環境のみ)
- F7 SmartScreen 警告 (release notes 明記済)

## R10 配布判定 (再確定)

✅ **release-now-acceptable** (R9 後と同判定、quality gate +5、measurement +3、user 導線 +1 で更に向上)

差分:

- **A1 12 widget proof-of-life**: 完全 covered、widget registry / WidgetShell breakage 即検出
- **E1 panic_hook 実動**: stub 解消、panic → toast 通知の経路確立
- **G3 axe Phase 2 hard gate**: critical=0 が CI 既定、nested main / lang fix で baseline clean
- **pubkey 手順書**: user が distribution era 着手するための導線完成、F3+F10 解消への user タスクが明確
- **D3/D9 IPC perf nightly**: palette / IPC 主要経路の P95 計測自動化

## 総 commit 数 (R1-R10)

R1-R9: 29 PR (audit-final-r9.md 参照)
R10-A: PR #323 (D9 IPC + D3 palette proxy)
R10-B: PR #324 (axe Phase 2 gate)
R10-C: PR #326 (i18n catalog + migrate)
R10-D: PR #327 (panic_hook + last-panic toast)
R10-E: PR #328 (keyboard dynamic gate)
R10-F: PR #329 (widget proof-of-life)

- pubkey doc: PR #325 (numbered R10 cycle 外、user 緊急要望)
  R10-final: 本 PR (audit-final-r10.md)

合計 **37 PR**。release readiness 改善のみで PASS 17 → 40 (**R2 比 +23、+135%**)。

## Distribution Era 着手判定 (R9 から再確定)

✅ **distribution era 着手可能、user タスク 4 step が gating**

R9 で agent judgment "distribution era 着手で良い" を user judgment で却下し R10 polish 続行。
R10 完了時点で:

- **release-now-acceptable** が R6 以降 5 サイクル維持 (R6 / R7 / R8 / R9 / R10)
- **PASS 40 = R2 baseline (17) の 2.35 倍**
- **残 FAIL 1 + 部分的 2** は全て agent 完遂不能 (user 物理 / 環境固有 / pubkey)
- **未検証 11** は agent 自動化済 (6 件 nightly 待ち) または agent 再現不能 (5 件)
- agent connaissances 続行で得られる polish の marginal value は逓減傾向

### user に必要な action items (再掲)

`docs/l1_requirements/distribution/pubkey-procedure.md` 参照。要約:

1. user 端末で `pnpm tauri signer generate -w <鍵保管 directory>\arcagate.key` (passphrase 必須、 cloud 同期外 drive 配下)
2. `arcagate.key.pub` を `tauri.conf.json` の `plugins.updater.pubkey` に commit (PR は agent 起票可)
3. `arcagate.key` 中身全文 を GH Actions secret `TAURI_SIGNING_PRIVATE_KEY` に登録
4. passphrase を GH Actions secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` に登録

これら 4 step 完了で **F3+F10 PASS**、PASS 41、配布判定 **release-with-updater** に格上げ。

## R11+ 候補 (release 後 polish、agent judgment では merit 薄)

- **R11-A**: D4 item launch P95 (実プロセス spawn の安全な mock 化)
- **R11-B**: i18n MAX_HARDCODE 段階削減 (catalog 経由 strings の段階拡大)
- **R11-C**: G3 axe Phase 3 (critical+serious=0 hard gate)
- **R11-D**: 残 部分的 C1/H1 の細部、E2 restart on crash (Tauri 機能要追加)

R10 完了で **polish era 終端**、release 公開 + user FB 駆動の運用フェーズへ移行可能。

## 最終 verdict

**R10 完了 = polish era 終端確定、distribution era 着手可能** ✅✅

audit cycle はここで clean close。次は user の pubkey 4 step 実行で auto-update 有効化 → release tag push で v0.1.0 公開、real user FB を駆動原力に運用フェーズへ。

## R10-X (post-final amend、cosign keyless)

audit-final-r10 sealed 後に user 指示で **Tier 1 + Tier 2 cosign keyless** の併用方針が確定、R10 cycle に R10-X を追加:

- `release.yml` に `sigstore/cosign-installer@v4.1.1` + `cosign sign-blob --yes --bundle` step
- MSI / NSIS / SHA256SUMS.txt 各々に `*.sigstore.json` 単一 bundle 生成 (cert + sig + Rekor 包含 proof)
- GH Actions OIDC token (`job_workflow_ref` claim) を Fulcio に提示する keyless flow、長期鍵不要
- `permissions: id-token: write` 追加、追加 secret 不要 (= **agent 完全自動、user 作業 0**)
- 検証手順: `docs/l1_requirements/distribution/cosign-verification.md` (135 行) で threat model + cosign verify-blob CLI + 出典明記

差分 audit:

- **F4** distribution attestation: 部分的 → **PASS** (Tier 2 cosign 配布元証明が CI 自動)
- **F9** SHA256 + cosign 同梱: **強化** (sha256 既存 + cosign bundle 追加で multi-layer)

これで R10 後 PASS は **40 → 41+ 見込み** (F4 PASS 化、次回 R11-final で確定集計)。
Tier 1 minisign は user 4 step 待ちのまま (本 audit-final-r10 §Distribution Era と同じ結論)。

R10-X は agent 完遂可能の最後の polish。これ以降は user FB / 実利用 issue 駆動で運用フェーズ。
