---
id: PH-20260427-413
status: todo
batch: 91
type: 防衛
era: UX Research Sprint
---

# PH-413: Codex に「Arcagate UX を業界標準と比較してどうか」相談

## 問題

batch-90 audit が agent 単独 + 浅い → 信頼度 2/5 だった。
batch-91 で業界標準 + 学術知見 + skill 強化を実施するが、それでもなお **agent 単独の評価**。

Rule C（Codex 相談必須）を厳格適用し、別モデルの目で再評価する。

## 改修

`run-codex` skill を使って Codex に以下を投げる:

### 入力

1. `docs/l1_requirements/use-cases.md`（PH-405 の 10 ケース）
2. `docs/l2_architecture/use-case-friction.md`（PH-406 の audit 結果）
3. `docs/l1_requirements/ux-research/industry-standards.md`（PH-410 業界標準）
4. `docs/l1_requirements/ux-research/cedec-papers.md`（PH-411 学術 / 講演）
5. Arcagate のコード概要（README + 主要コンポーネントリスト）

### 質問項目（Codex に投げる）

1. **業界標準照合**: Arcagate UX を Raycast / Steam / Playnite と比較して、agent の「macro 0」判定は妥当か?
2. **見落とし候補**: agent が見落とした摩擦点として、どこを疑うべきか? 具体 5 件以上
3. **数値ベンチマーク評価**: Arcagate の現状指標（exe 16.5MB / vitest 142 件 等）が業界標準と比較して competitive か?
4. **構造再設計の必要性**: 業界知見を踏まえて Arcagate の画面構成は再設計すべきか? Yes/No と理由
5. **Polish Era 完走宣言の妥当性**: 業界比較で、本当に「公開できる品質」と言えるか?

### Codex 回答の処理

- 採用提案は別 plan 化（batch-92 以降）
- 却下は理由付きで dispatch-log
- 重要指摘は `docs/l1_requirements/ux-research/codex-review.md` に記録

## 解決理屈

- 別モデル（GPT-5 系）の目 = 別 bias の捕捉
- agent が「業界知ってる気になってる」を Codex で fact-check
- ユーザに渡す前の最終 sanity check

## メリット

- 信頼度大幅向上（agent 単独 2/5 → Codex 確認で 3-4/5 期待）
- ユーザの貴重な実機 walkthrough 時間を節約（あらかじめ問題を絞れる）
- Rule C の慣行確立

## デメリット

- Codex 利用コスト
- Codex も別 bias を持つ（万能ではない）
- 「Codex が OK と言ったから」は trap、agent の判断が最終

## 受け入れ条件

- [ ] `run-codex` skill で 5 質問を投げる
- [ ] `docs/l1_requirements/ux-research/codex-review.md` に Codex 回答 + agent の採用 / 却下判定
- [ ] Codex 提案で plan 化すべきものは batch-92 候補に追加
- [ ] dispatch-log に Codex 相談実施 + 主要指摘
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **I**mage（HICCUPPS）: 別モデル視点での Image オラクル強化
- **P**roduct internal consistency（HICCUPPS）: 一貫性の他者目線確認
