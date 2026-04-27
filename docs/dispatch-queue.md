# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-99**: 次バッチ候補 (Codex 4 回目結果次第で決定)

## In-Flight (auto-merge 待ち)

- **batch-96**: Polish Era 完走判定 (branch deleted、PR: #157 auto-merge pending、status: in-flight)
- **batch-97**: Distribution Era 着手 (branch deleted、PR: #158 auto-merge pending、status: in-flight)
- **batch-98**: Distribution Era 第 2 波 plan (branch deleted、PR: #159 auto-merge pending、status: in-flight)

## Next Up

- **batch-99**: PH-446〜450 実装 (Updater UI / Release workflow / SBOM / 配布 README / Codex 4 回目)
- **batch-100**: Polish Era 完走宣言 (Codex 4 回目 OK 後) + Maintenance Era 着手準備
- **batch-101**: 機能拡張系 (launch group / Shift+click 範囲選択 / etc) — Rule A 承認待ち

## Completed (last 5)

- **batch-95**: Dispatch Infra Overhaul (PH-435) — auto-merge / queue / auto-kick / spawn-on-pressure、PR #156 merged
- **batch-94**: UX Audit Re-Validation Round 3 (PH-425〜429) — Codex Q5 残 3 件解消、PR #154 merged
- **batch-93**: UX Audit Re-Validation Round 2 (PH-420〜424) — Codex Q5 残 5 件解消、PR #152 merged
- **batch-92**: UX Audit Re-Validation Round 1 (PH-415〜419) — HE+CW v2、PR #150 merged
- **batch-91**: UX Research Sprint (PH-410〜414) — 業界標準収集 + Codex Rule C、PR #148 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
5. **In-Flight 区分追加** (本セッションで導入): auto-merge 待ち PR を可視化、main 未反映の commit が積まれているフェーズ用
