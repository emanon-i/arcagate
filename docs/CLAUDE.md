# docs (doc を書く / 直す時)

- **doc システムの層別構造と役割**: [`README.md`](README.md)
- **SSOT 原則 (最重要)**: ある事実 / ルール / 仕様は **1 つの正本にだけ書く**。他 doc はコピペせず
  参照 / リンクで導く。重複を見つけたら正本を 1 つ決め、残りを参照に置き換える。各節に「ここが何の正本か」を立てる
- **正本の割り当て** (どこに書くか):
  - perf 予算 / UX 標準の数値 / motion token → [`l1_requirements/vision.md`](l1_requirements/vision.md)
  - 設計判断 / レイヤー / IPC / schema 設計 → [`l2_foundation/foundation.md`](l2_foundation/foundation.md)
  - feature の機能契約 → [`l2_foundation/features/`](l2_foundation/features/)
  - design token / 文言 / button → `l2_foundation/{design-tokens,i18n-policy,button-usage}.md`
  - coding rule (固定枠 / 禁止 / 作業規律) → [`../.claude/rules/`](../.claude/rules/)
  - schema / token 値 / 関数シグネチャの生値 → コード (`migrations/*.sql` / `arcagate-theme.css`)
- **書き方の芯**: 方向性を打ち出し実装のブレを絞る。実装を逐一 pin しない (over-specify 回避)。
  口語でなく技術用語で書く。バズワードで飾らない
- **削除 / 移設した内容の履歴**は [`../CHANGELOG.md`](../CHANGELOG.md) に集約 (本文から履歴ごと消さない)
- 全体の地図: [`../AGENTS.md`](../AGENTS.md)
