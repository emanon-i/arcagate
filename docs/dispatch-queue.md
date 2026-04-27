# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- (なし — batch-106 完走、Codex 5 回目で v0.2.0 Go 判定取得済、user 報告で Goal A 達成済)

## In-Flight (auto-merge 待ち)

- **PR #174** batch-106 impl (PH-465/466/470/471 + LTO + Codex 5 review)、CI 進行中

## Next Up (batch-107、Codex 5 で TOP 3 推奨)

- **PH-472**: panic_hook + ErrorBoundary 統合 end-to-end (hard crash 捕捉)
- **PH-473**: KillSwitchDialog UX (何が無効化 / なぜ / 次に何をすべきか の明示)
- **PH-474**: Telemetry/Crash 配信信頼性 (flush() 24h timer / retry+backoff+jitter)
- 防衛 1 + 整理 1 (batch-107 着手時に決定)

## Held (ユーザ作業待ち、v0.2.0 リリース後も継続)

- **PH-455**: Updater pubkey 本番化 (PC 前到着時にユーザ鍵生成 + GitHub Secret 登録)
- **Authenticode 証明書**: Azure Trusted Signing 候補、ユーザ判断 + Microsoft Partner Center 申請待ち
- **Microsoft Store 登録**: MSIX packaging 経由 (B ライン代替案)

## Held (ユーザ作業待ち)

- **PH-455**: Updater pubkey 本番化 (PC 前到着時にユーザ鍵生成 + GitHub Secret 登録)
- **Authenticode 証明書**: Azure Trusted Signing 候補、Microsoft Partner Center 申請待ち

## Completed (last 5)

- **batch-106**: HTTP infra + Telemetry/Crash 実装 + LTO + Codex 5 Go 判定 (PH-465/466/469/470/471)、PR #173 + #174 merged → **Goal A 達成、v0.2.0 Go**
- **batch-105**: PH-464/467/468 Distribution Era Hardening (3 done + 2 deferred)、PR #172 merged
- **batch-104**: Distribution Era 設計 docs (PH-459〜463) + auto-kick 動作実証、PR #171 merged
- **batch-103**: Updater 自動チェック / readiness / rollback SOP (PH-456-458)、PR #170 merged
- **batch-102**: PH-448 SBOM done + Codex 4 回目 → Polish 完走 No-go (PH-450 deferred)、PR #167 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
5. **In-Flight 区分**: auto-merge 待ち PR を可視化、main 未反映の commit が積まれているフェーズ用 (PH-435 batch-95)
