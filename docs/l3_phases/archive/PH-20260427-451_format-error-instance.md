---
id: PH-20260427-451
status: done
batch: 99
type: 整理
era: Distribution Era
---

# PH-451: format-error.ts に Error instance 対応追加

## 問題

batch-94 PH-429 で getErrorMessage helper 新設したが、`error instanceof Error` のケース対応漏れ。
JavaScript の throw new Error('...') を catch したとき、現状 `obj.message` で拾えるが Error subclass (TypeError, RangeError 等) の判定が暗黙的。

## 改修

`src/lib/utils/format-error.ts`:

- `getErrorMessage` の最初に `if (error instanceof Error) return error.message;` を追加
- Error subclass (TypeError 等) も同様に message を取得

## 受け入れ条件

- [x] format-error.ts に Error instance 分岐追加
- [x] format-error.test.ts に Error / TypeError ケース 2 件追加
- [x] `pnpm verify` 全通過
