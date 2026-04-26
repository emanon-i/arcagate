---
id: PH-20260427-409
status: todo
batch: 90
type: 整理
era: Polish Era / Use Case Audit
---

# PH-409: 不要 / 重複機能の削除候補リスト + batch-91 提案

## 仕様

walkthrough 結果から「使われていない / 重複 / 削除可」と判断された機能を `docs/l2_architecture/cleanup-candidates.md` に記録:

- 機能名 / 場所（ファイルパス）
- 削除候補理由（使われない / 重複 / レガシー / etc）
- 影響範囲（依存箇所、削除時の作業量）
- 優先度（high / medium / low）

batch-90 では **削除しない**（リスト作成のみ）、次バッチ以降で消化。

### batch-91 提案

batch-90 の audit 結果ベースで:

- medium 摩擦（機能追加 / 既存改修）
- 削除候補から high 優先度のもの
- E2E カバレッジが薄いケース補強

を 5 plan に組む。**Rule A 該当のものはユーザ承認待ち**。

## 受け入れ条件

- [ ] cleanup-candidates.md 新設（候補ゼロなら「現状 OK」明記）
- [ ] dispatch-log に batch-90 完走 + audit サマリ + macro 摩擦エスカレーション（あれば）
- [ ] batch-91 5 plan 候補を本書に記載
- [ ] `pnpm verify` 全通過
