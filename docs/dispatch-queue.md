# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-103**: Distribution Era Hardening (PH-454 done + PH-456-458 実装中、PH-455 Held)

## In-Flight (auto-merge 待ち)

- **batch-101**: PH-444 bulk tag tests (PR #166、e2e rebase 後 rerun 中)
- **batch-103**: PH-454 version 同期 + plan (PR #168、CI 進行中)

## Next Up

- **batch-104**: Codex Q4 残 (SmartScreen reputation / Telemetry / Crash 監視)
- **batch-105**: Maintenance Era (regression 拡充 / dependency 更新 / SBOM 自動更新)
- **batch-106**: 機能拡張系 (launch group [Rule A] / 任意タグ popover / Shift+click 範囲選択)

## Held / User Action Needed

PC 前にユーザが居ないと進められないタスク (resume 10 / 自動進行は不可、ユーザ実行待ち):

- **PH-455**: Updater pubkey 本番化 (Codex Critical #1)
  - Reason: `tauri signer generate` でユーザの local 鍵生成が必要、生成秘密鍵を GitHub Secret に登録 (`TAURI_SIGNING_PRIVATE_KEY` + `_PASSWORD`)
  - Status: **Held**、PC 前到着まで保留
  - Held since: 2026-04-27

## Completed (last 5)

- **batch-102**: PH-448 SBOM done + Codex 4 回目 → Polish 完走 No-go、PR #167 merged
- **batch-100**: Distribution Era 第 2 波 (Updater UI / Release workflow / 配布 README)、PR #164 merged
- **batch-97**: Distribution Era 着手 (Authenticode / Updater plugin / e2e 拡張)、PR #158 merged
- **batch-98**: Distribution Era 第 2 波 Plan (PH-446〜450)、PR #159 merged
- **batch-95**: Dispatch Infra Overhaul (PH-435) — auto-merge / queue / auto-kick / spawn-on-pressure、PR #156 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
5. **In-Flight 区分**: auto-merge 待ち PR を可視化、main 未反映の commit が積まれているフェーズ用 (PH-435 batch-95)
6. **Held / User Action Needed 区分**: PC 前のユーザ作業待ち (鍵生成 / Secret 登録 / 証明書取得 等)、自動進行不可
