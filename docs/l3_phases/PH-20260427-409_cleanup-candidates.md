---
id: PH-20260427-409
status: done
batch: 90
type: 整理
era: Polish Era / Use Case Audit
---

## 完了ノート

`docs/l2_architecture/cleanup-candidates.md` 新設、削除候補 **0 件**確認。

### batch-91 候補（5 plan、Rule A 該当に注意）

walkthrough（PH-406）の medium 摩擦 11 件から高優先 5 件:

- **PH-410** launch 失敗時 diagnose 強化（case 1）: ファイル未存在 / 権限なし / 実行不可 を区別、適切な復旧導線
- **PH-411** 一括 D&D + 一括タグ付け（case 2）: 複数ファイル D&D で共通タグ + ItemForm 簡易フォーム
- **PH-412** launch group / 関連起動（case 3）: 1 アイテムから複合起動。**Rule A 該当**（IPC 設計変更 + UX 大）→ ユーザ承認待ち
- **PH-413** icon extraction async 化（case 5、refactoring C-2）: spawn_blocking 化。Rule A グレー（IPC 変更だが既存契約維持）
- **PH-414** ClipboardHistory 検索（case 6）: 履歴検索バー追加、軽量

PH-412 は **Rule A 確実、ユーザ承認後**。他は plan 化時に範囲確認。

### Polish Era 完走宣言

PH-403 で「Polish Era 完走判定は batch-90 後に再判定」とした。batch-90 audit 結果:

- macro 摩擦 **0 件** → 構造再設計不要、Restructure Era 不要
- micro 摩擦 **0 件** → batch-87/88/89 で消化済
- medium 摩擦 11 件 → 機能追加 / 改修、batch-91+ で順次

→ **Polish Era 完走宣言可能**。Distribution Era（PR 番号 batch-9X）への移行も batch-91〜95 の medium 摩擦消化と並行で進められる。

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
