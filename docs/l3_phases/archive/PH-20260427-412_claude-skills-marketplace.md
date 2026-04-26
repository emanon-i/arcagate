---
id: PH-20260427-412
status: partial
batch: 91
type: 改善
era: UX Research Sprint
---

# PH-412: Claude Code Skills marketplace 探査

## 問題

agent の判定基盤（コード read + 知識ベース）に limit がある:

- UX review / 自動 audit / アーキテクチャ評価 を体系的に行うツールなし
- 競合比較 / 業界標準照合 を毎回 ad-hoc 実施
- 既存 skill（`.claude/skills/`）はプロジェクト固有、汎用 UX 系 skill は未導入

ClaudeCode 環境を Arcagate プロジェクトに最適化する余地。

## 改修

WebFetch で marketplace / community sources を探査:

### 探査対象

- **Claude Code Plugins**（`/plugins` コマンド対象、公式 marketplace）
- **claude-code-skills GitHub repos**（コミュニティ skill 集）
- **awesome-claude-code** 系リポジトリ
- **Anthropic 公式 Cookbook / Examples**

### 評価軸

- **UX review** 系: 自動 UI audit、screenshot 解析、accessibility check
- **アーキテクチャ評価** 系: 依存グラフ、複雑度計測、code smell
- **競合比較** 系: 公開 product と比較 review
- **CDP / browser automation** 系: e2e + visual diff
- **Codex 連携** 系: Rule C 実行を smooth に

### 評価フィルタ

- メンテ活性（最終 commit 6 ヶ月以内）
- star 数 / 利用者数
- 評判（issue trends / discussion）
- ライセンス（MIT / Apache 2 推奨）

### 導入判定

上位 2〜3 個を `.claude/plugins.json` に追加 or skill ファイル取り込み。
**追加自体は Rule A 該当の可能性**（プロジェクト config 改変）→ 導入前にユーザ承認。

## 解決理屈

- 既存 skill だけでは限界、コミュニティの集合知で agent 強化
- batch-92 re-audit で具体 skill を駆使すれば信頼度向上
- 配布水準を狙うなら一回りある UX evaluation tooling が欲しい

## メリット

- agent 単独では発見しにくい問題を skill が拾う
- 業界標準 audit を skill 化（再現可能）
- 他プロジェクトへの応用可

## デメリット

- skill のコード read 必要（`.claude/skills/` に取り込むので透明性確保）
- 依存追加 = メンテ義務追加
- 「skill が良いと言ったから OK」は trap、agent の最終判断が必要

## 受け入れ条件

- [ ] `docs/l1_requirements/ux-research/claude-skills-survey.md` 新設
- [ ] marketplace / community 探査結果 10 個以上のリスト
- [ ] 評価軸ごとの top 候補（UX review / architecture / 競合比較 等）
- [ ] 導入候補 2〜3 個に絞り込み + 採用判定の根拠
- [ ] **導入は Rule A 該当の可能性のため Dispatch にユーザ承認依頼を batch-91 完走時に**
- [ ] `pnpm verify` 全通過（docs only）

## SFDIPOT 観点

- **S**tructure（環境構造）: ClaudeCode 環境の structure 補強
- **O**perations（運用）: agent 運用の信頼性向上
