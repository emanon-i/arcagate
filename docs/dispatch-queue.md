# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-105**: Distribution Era Hardening (PH-464/467/468 done、PH-465/466 deferred → batch-106)、PR #172 auto-merge 予約

## In-Flight (auto-merge 待ち)

- **PR #172** batch-105 (PH-464/467/468)、CI 進行中

## Next Up (batch-106)

- **PH-469**: HTTP client 共有実装 (kill-switch / Telemetry / Crash 監視 共通基盤)
- **PH-465**: Telemetry 実装本体 (PostHog endpoint or 自前、本 HTTP client 流用)
- **PH-466**: Crash 監視実装 (Sentry endpoint、本 HTTP client 流用)
- 防衛 1 + 整理 1 (batch-106 着手時に決定)

## Held (ユーザ作業待ち)

- **PH-455**: Updater pubkey 本番化 (PC 前到着時にユーザ鍵生成 + GitHub Secret 登録)
- **Authenticode 証明書**: Azure Trusted Signing 候補、Microsoft Partner Center 申請待ち

## Completed (last 5)

- **batch-104**: Distribution Era 設計 docs (PH-459〜463) + auto-kick 動作実証、PR #171 merged
- **batch-103**: Updater 自動チェック / readiness / rollback SOP (PH-456-458)、PR #170 merged
- **batch-102**: PH-448 SBOM done + Codex 4 回目 → Polish 完走 No-go (PH-450 deferred)、PR #167 merged
- **batch-101**: PH-444 bulk tag tests done + 4 plan deferred、PR #166 merged
- **batch-100**: Distribution Era 第 2 波 (Updater UI / Release workflow / 配布 README)、PR #164 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
5. **In-Flight 区分**: auto-merge 待ち PR を可視化、main 未反映の commit が積まれているフェーズ用 (PH-435 batch-95)
