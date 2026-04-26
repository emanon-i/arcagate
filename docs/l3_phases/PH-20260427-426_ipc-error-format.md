---
id: PH-20260427-426
status: done
batch: 94
type: 防衛
era: UX Audit Re-Validation Round 3
---

# PH-426: IPC エラー全般のフォーマット統一

## 問題

Codex Q4 推奨 #3: launch error 以外の IPC エラー (cmd_create_item / cmd_save_theme 等) で「toast 短文 + stack」のままの箇所が散在。
formatLaunchError 同等の「原因 + 次の操作」フォーマットを汎用化する必要。

## 改修

- `src/lib/utils/ipc-error.ts` 新設: formatIpcError(operation, error)
  - operation: "アイテム作成" / "テーマ保存" / "設定保存" 等の人間語
  - 「<operation> に失敗しました — <原因 from AppError::code()>」フォーマット
  - 既知 code (db.lock / not_found / invalid_input / 等) ごとに hint 文言
  - 未知 code は string fallback
- 既存 toast.add(`<op>に失敗: ${e}`) パターンを grep + 一括 formatIpcError 経由に統一

## 受け入れ条件

- [ ] formatIpcError helper 新設 (db.lock / not_found / invalid_input / cancelled 等カバー)
- [ ] 既存 catch 箇所を grep + 一括置換 (5+ 箇所)
- [ ] formatIpcError.test.ts 6 ケース
- [ ] `pnpm verify` 全通過
