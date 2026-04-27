# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-100**: Distribution Era 第 2 波実装 (Updater UI / Release workflow / SBOM / 配布 README / Codex 4 回目)

## In-Flight (auto-merge 待ち)

- **batch-96**: Polish Era 完走判定 (PR: #157、CI all pass、auto-merge unblock pending)
- **batch-99**: PH-451 Error instance helper (PR: #162、CI all pass、auto-merge unblock pending)
- **dispatch-log batch-95-98 完走記録**: PR: #161 (e2e flaky → rebase 後 rerun 中)

## Next Up

- **batch-101**: PH-444 (bulk tag tests deferred 解消) + auto-kick prompt 検証実装
- **batch-102**: Codex 4 回目結果次第 (Polish Era 完走宣言 or 残作業継続)
- **batch-103**: 機能拡張系 (launch group [Rule A] / Shift+click 範囲選択 / 任意タグ popover)

## Completed (last 5)

- **batch-97**: Distribution Era 着手 (PH-441〜445) — Authenticode 署名 / Updater plugin / e2e 拡張、PR #158 merged
- **batch-98**: Distribution Era 第 2 波 Plan (PH-446〜450) — plan のみ、PR #159 merged
- **batch-95**: Dispatch Infra Overhaul (PH-435) — auto-merge / queue / auto-kick / spawn-on-pressure、PR #156 merged
- **batch-94**: UX Audit Re-Validation Round 3 (PH-425〜429) — Codex Q5 残 3 件解消、PR #154 merged
- **batch-93**: UX Audit Re-Validation Round 2 (PH-420〜424) — Codex Q5 残 5 件解消、PR #152 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
5. **In-Flight 区分**: auto-merge 待ち PR を可視化、main 未反映の commit が積まれているフェーズ用 (PH-435 batch-95)
