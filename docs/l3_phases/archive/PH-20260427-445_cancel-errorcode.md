---
id: PH-20260427-445
status: done
batch: 97
type: 整理
era: Distribution Era + Codex Q5 残
---

# PH-445: cmd_cancel_file_search の errorCode 判定化 (Codex Q5 #3)

## 問題

batch-93 PH-420 で file-search cancel 実装、batch-94 PH-429 で AppError serialize を { code, message } object 化、
しかし `FileSearchWidget.svelte:74` で `String(e).includes('Cancelled')` のまま (文字列依存)。
Codex 3 回目 Q5 #3: errorCode 経由に統一すべき。

## 改修

`src/lib/widgets/file-search/FileSearchWidget.svelte`:

```ts
import { getErrorCode } from '$lib/utils/format-error';

// 修正前
if (String(e).includes('Cancelled')) {
  entries = [];
}

// 修正後
if (getErrorCode(e) === 'cancelled') {
  entries = [];
}
```

### grep audit

他に `.includes('Cancelled')` / `.includes('FileNotFound')` 等の string contains パターンを grep:

- 全て `getErrorCode(e) === '<code>'` に置換

### 受け入れ条件

- [ ] FileSearchWidget の Cancelled 判定を errorCode 経由に変更
- [ ] grep audit で他の string contains パターン 0 件確認
- [ ] vitest format-error.test.ts に getErrorCode カバレッジ追加 (既存ある場合は scope 確認)
- [ ] `pnpm verify` 全通過
