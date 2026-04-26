---
id: PH-20260427-406
status: todo
batch: 90
type: 改善
era: Polish Era / Use Case Audit
---

# PH-406: walkthrough + 摩擦点リスト化

## 仕様

PH-405 の 10 ケースを agent 自身が walkthrough（コード読み主体、必要に応じて CDP）。

各ケースで:

1. 現状フローを **コード read で把握**（components / state / IPC）
2. 想定どおり動くか確認（既存 e2e テストがあれば参照）
3. 必要なら `pnpm tauri dev` 起動 + CDP で実機検証
4. 摩擦点を `docs/l2_architecture/use-case-friction.md` に記録

摩擦点の分類:

- **micro**（小さな摩擦、1 〜 5 行で直る） → PH-407 で **即修正**
- **medium**（機能追加 / 既存改修、5 ファイル以下） → 別 plan、batch-91 へ
- **macro**（画面構成 / 構造再設計、Rule A 該当） → batch-90 完走時にユーザエスカレーション

## 受け入れ条件

- [ ] use-case-friction.md 新設、各ケースに摩擦点（あれば）記録
- [ ] micro 摩擦は同コミットで修正、PH-407 にも記載
- [ ] medium / macro はリストアップのみ
- [ ] `pnpm verify` 全通過
