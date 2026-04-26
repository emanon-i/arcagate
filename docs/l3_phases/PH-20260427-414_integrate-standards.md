---
id: PH-20260427-414
status: todo
batch: 91
type: 整理
era: UX Research Sprint
---

# PH-414: 数値ベンチマーク + チェックリスト統合

## 問題

PH-410〜413 の成果物がバラバラに `docs/l1_requirements/ux-research/` 配下に散らばる。

- agent が次バッチで参照しやすい形で集約されてない
- `ux_standards.md` / `engineering-principles.md` から ux-research/ への導線がない
- batch-92 re-audit でチェックリスト形式で機械的に適用したい

## 改修

### `docs/l1_requirements/ux_standards.md` 更新

- ux-research/ への参照リンク追加
- Nielsen 10 ヒューリスティックチェックリスト（PH-411 から）統合
- 数値ベンチマーク（応答時間 / メモリ / クリック数）を「目標値」として記載

### `docs/l0_ideas/arcagate-engineering-principles.md` §9 更新

- 客観指標表に **業界標準値の列** 追加（agent が「業界比 ◯◯%」で評価可能）
- 「Polish Era 完走判定」の条件を業界標準ベースに改訂

### `docs/l3_phases/_template/use-case-audit.md` 雛形

- batch-92 以降で再 audit する際の **テンプレート**
- 各ケース walkthrough 時の Nielsen 10 チェックボックス
- Cognitive walkthrough 4 ステップ
- 業界比較欄
- 数値計測欄（実機計測時の項目）

### `docs/l2_architecture/use-case-friction.md` 旧 audit 結果のステータス更新

- batch-90 の audit を「初版、信頼度 2/5」と明記
- batch-92 で業界標準ベースで再 audit 予定と記載

## 解決理屈

- バラバラ資料 → 統合されたチェックリスト → 機械的に適用
- 次バッチで「Nielsen 10 を 1 件ずつ確認」の形で再 audit が可能
- 数値計測（PH-402 deferred）と組み合わせれば客観評価が成立

## メリット

- batch-92 re-audit が **手順化** され信頼度向上
- 次回 Use Case Audit を回す時に「ux_standards.md 見れば即実施」となる
- engineering-principles.md §9 が「数字で語れる」レベルに

## デメリット

- 統合作業がボリューム
- 雛形が overkill になる risk（必要最低限に絞る判断要）

## 受け入れ条件

- [ ] `ux_standards.md` 更新（ux-research/ リンク + Nielsen 10 + 数値目標）
- [ ] `engineering-principles.md` §9 更新（業界標準列追加）
- [ ] `docs/l3_phases/_template/use-case-audit.md` 雛形作成
- [ ] `use-case-friction.md` を「初版、信頼度 2/5」と明記
- [ ] dispatch-log に batch-91 完走 + batch-92 re-audit 提案
- [ ] `pnpm verify` 全通過
