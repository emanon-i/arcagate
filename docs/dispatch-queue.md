# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-95**: Dispatch Infra Overhaul (branch: `feature/batch-20260427-95`, PR: #156, status: in-progress)

## Next Up

- **batch-96**: Codex Rule C 3 回目 + Polish Era 完走判定 + 機能拡張系 (一括タグ / launch group / clipboard 検索)
- **batch-97**: 実機ベンチ実行 (PH-419 deferred 解消)
- **batch-98**: Distribution Era 着手 (Windows Authenticode / Update 機構)

## Completed (last 5)

- **batch-94**: UX Audit Re-Validation Round 3 (PH-425〜429) — Codex Q5 残 3 件解消、PR #154 merged
- **batch-93**: UX Audit Re-Validation Round 2 (PH-420〜424) — Codex Q5 残 5 件解消、PR #152 merged
- **batch-92**: UX Audit Re-Validation Round 1 (PH-415〜419) — HE+CW v2、PR #150 merged
- **batch-91**: UX Research Sprint (PH-410〜414) — 業界標準収集 + Codex Rule C、PR #148 merged
- **batch-90**: Use Case Audit (PH-405〜409) — v1 (信頼度 2/5)、Polish Era 完走宣言は取消、PR #147 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
