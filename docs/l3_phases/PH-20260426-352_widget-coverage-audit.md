---
id: PH-20260426-352
status: todo
batch: 79
type: 改善
---

# PH-352: Widget coverage audit script + Plan テンプレ整備

## 横展開チェック実施済か

- batch-74 で `audit-labels.sh` を機械化したのと同じパターン
- Rust enum (`WidgetType`) と TS union の集合差分を検出する CI step が必要

## 仕様

- `scripts/audit-widget-coverage.sh`:
  - Rust `models/workspace.rs` から WidgetType arm を grep 抽出
  - TS `types/workspace.ts` から union member を grep 抽出
  - 集合差分が空でなければ exit 1
- CI ci.yml に Label audit と並ぶ step として組み込み
- Plan テンプレに「ウィジェット追加チェックリスト」必須節を追加（widget-add-checklist.md）

## 受け入れ条件

- [ ] audit-widget-coverage.sh が Rust と TS の widget_type 集合一致を検証
- [ ] 意図的に片方だけ entry 追加すると exit 1 で fail することをテスト
- [ ] CI step 統合
- [ ] docs/widget-add-checklist.md 作成、Plan テンプレに参照リンク追加
- [ ] `pnpm verify` 全通過
