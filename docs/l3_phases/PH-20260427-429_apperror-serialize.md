---
id: PH-20260427-429
status: todo
batch: 94
type: 整理
era: UX Audit Re-Validation Round 3
---

# PH-429: AppError serialize 構造化 ({ code, message })

## 問題

PH-417 + PH-422 で launch error の構造化判定を進めたが、フロント側はまだ string contains で判定。
PH-422 で AppError::code() メソッド追加済 → 本 plan で serialize 形式を `{ code, message }` に変更し、フロント全 IPC catch を構造化判定へ移行。

## 改修

- `src-tauri/src/utils/error.rs` の `serde::Serialize for AppError`:
  - 現状: `serializer.serialize_str(&self.to_string())`
  - 変更後: `serializer.serialize_struct({ code, message })`
- フロント `src/lib/utils/launch-error.ts` を errorCode field 判定に改修
- formatIpcError も errorCode 経由に
- 全 IPC catch サイト確認 (toast.add(`...: ${e}`)) で `${e}` が `[object Object]` にならないよう修正
- 既存 e2e で文言 assert している箇所の互換性確認

## 受け入れ条件

- [ ] AppError serialize を `{ code, message }` object に変更
- [ ] launch-error.ts を errorCode 判定に改修 (string fallback 残置)
- [ ] launch-error.test.ts に errorCode 経由ケース 3 件追加
- [ ] formatIpcError も errorCode 利用
- [ ] フロント全 IPC catch で `String(e)` → `e.message ?? String(e)` の変換 grep audit
- [ ] e2e 文言検証テストで動作確認
- [ ] `pnpm verify` 全通過
