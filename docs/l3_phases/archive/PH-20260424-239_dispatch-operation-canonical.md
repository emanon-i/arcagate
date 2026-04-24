# PH-20260424-239 dispatch-operation.md canonical 化

- **フェーズ**: batch-57 Plan A
- **status**: done
- **開始日**: 2026-04-24

## 目的

`docs/dispatch-operation.md` を現行運用と完全一致させる。旧記述（develop ブランチ・在庫 2 件以下停止・個人 UX 基準）を撤廃し、10 項目の確定ルールを反映する。

## 受け入れ条件

- [x] §1「開発の流れ canonical」が新設されている（バッチ全体→Plan ごと→バッチ完走後の 3 段構成）
- [x] §2 に 1バッチ 1PR・`feature/batch-YYYYMMDD-N`・rebase-and-merge・squash 禁止が明記されている
- [x] §2 に 1バッチ 5 Plan 内訳（改善 3 + 防衛 1 + 整理 1）が明記されている
- [x] §1 に `/clear` → L0/L1/dispatch-log 再読 → 60 秒以内 Plan 作成が明記されている
- [x] `/simplify` 運用（commit 前レビュー）が記載されている
- [x] Plan 在庫切れでは止まらない旨が明記されている（旧「2件以下停止」撤回）
- [x] 受け入れ条件の自動/主観分離が明記されている
- [x] 実機検証原則（Playwright CDP 経由）が明記されている
- [x] 60 秒ルールが明記されている
- [x] ExitPlanMode 禁止が明記されている
- [x] main ベース運用・force push 禁止が明記されている
- [x] develop ブランチへの言及が削除されている（「廃止済み・過去履歴のみ」の記述のみ残存）
