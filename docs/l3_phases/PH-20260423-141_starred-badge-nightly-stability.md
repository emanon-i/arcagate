---
id: PH-20260423-141
title: starred-badge テストの nightly 安定化（timeout 明示）
status: todo
priority: medium
type: test-infra
parallel_safe: true
depends_on: []
---

# PH-20260423-141: starred-badge テストの nightly 安定化

## 背景・目的

`library-empty-starred.spec.ts` の starred-badge テストは `@smoke` から除外済みだが、
nightly フルスイートでも `not.toBeVisible()` が `expect.timeout: 10_000`（10s）で
タイムアウトする可能性がある。

`updateItem` IPC → `items` ストア → `$effect` → `searchItemsInTag` IPC → DOM 更新の
2段階非同期チェーンは CI で 10s を超える場合がある。
nightly テストの信頼性向上のため `not.toBeVisible()` に明示 timeout を追加する。

## スコープファイル

- `tests/e2e/library-empty-starred.spec.ts`

## 変更内容

```typescript
// Before:
await expect(card.getByTestId('starred-badge')).not.toBeVisible();

// After:
await expect(card.getByTestId('starred-badge')).not.toBeVisible({ timeout: 20_000 });
```

同様に、`toBeVisible()` のアサーションにも明示 timeout を追加:

```typescript
// starred バッジが表示される
await expect(card.getByTestId('starred-badge')).toBeVisible({ timeout: 20_000 });
```

## 受け入れ条件

- [ ] `not.toBeVisible()` および `toBeVisible()` の starred-badge アサーションに `{ timeout: 20_000 }` が追加されている
- [ ] `pnpm exec biome check tests/e2e/library-empty-starred.spec.ts` がエラーなし
