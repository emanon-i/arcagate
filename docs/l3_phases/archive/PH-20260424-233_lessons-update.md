---
id: PH-20260424-233
title: lessons.md 更新（batch-53/54 E2E strict mode 知見）
status: done
priority: low
parallel_safe: true
scope_files:
  - docs/lessons.md
depends_on: []
---

## 実装内容

`docs/lessons.md` に batch-53 E2E 失敗から得た知見を追記:

1. `getByText('radius')` は部分一致なので `radius-chip` 等にもマッチする →
   `{ exact: true }` を使う
2. `.not.toBeVisible()` に対して strict mode 違反が起きる場合は `.first()` を使う
   （`toBeVisible()` 同様、not 側も strict mode が適用される）

## 受け入れ条件

- [ ] lessons.md に上記 2 パターンが記録されている
- [ ] `pnpm verify` 全通過
