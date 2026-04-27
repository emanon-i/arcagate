# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-103**: Distribution Era Hardening (PH-454 version 同期 done + PH-455-458 plan only、実装は resume 10 で連続着手)

## In-Flight (auto-merge 待ち)

- (現状なし、batch-101/102 は merged)

## Next Up (resume 10 で着手)

- **PH-455**: Updater pubkey 本番化 (Codex Critical #1)
- **PH-456**: Updater 自動チェック (起動時 + 24h)
- **PH-457**: Distribution Hardening 整理 (distribution-readiness.md 新設)
- **PH-458**: Rollback / kill-switch SOP

## Completed (last 5)

- **batch-102**: PH-448 SBOM done + Codex 4 回目 → Polish 完走 No-go (PH-450 deferred)、PR #167 merged
- **batch-101**: PH-444 bulk tag tests done + 4 plan deferred、PR #166 merged
- **batch-100**: Distribution Era 第 2 波 (Updater UI / Release workflow / 配布 README)、PR #164 merged
- **batch-97**: Distribution Era 着手 (Authenticode 署名 / Updater plugin / e2e 拡張)、PR #158 merged
- **batch-98**: Distribution Era 第 2 波 Plan (PH-446〜450)、PR #159 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
5. **In-Flight 区分**: auto-merge 待ち PR を可視化、main 未反映の commit が積まれているフェーズ用 (PH-435 batch-95)
