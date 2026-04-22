---
id: PH-20260423-140
title: items.spec.ts に waitForLibraryReady を適用
status: todo
priority: medium
type: test-infra
parallel_safe: true
depends_on: [PH-20260423-139]
---

# PH-20260423-140: items.spec.ts に waitForLibraryReady を適用

## 背景・目的

PH-139 で追加した `waitForLibraryReady` を `items.spec.ts` の
「IPC 経由でアイテムを作成すると一覧に反映されること」テストに適用する。

現在は `toBeVisible({ timeout: 30_000 })` で直接待機しているが、
Library のデータロード完了 → 特定カード表示の2段階で待つことで
CI での信頼性がさらに高まる。

## スコープファイル

- `tests/e2e/items.spec.ts`

## 変更内容

```typescript
// Before:
await waitForAppReady(page);
// reload 後の IPC ロード完了まで待つ（CI では 30s まで許容）
await expect(page.getByTestId(`library-card-${item.id}`)).toBeVisible({ timeout: 30_000 });

// After:
await waitForAppReady(page);
await waitForLibraryReady(page);  // Library データロード完了を待つ
await expect(page.getByTestId(`library-card-${item.id}`)).toBeVisible();
```

`waitForLibraryReady` が先にライブラリの準備完了を確認するため、
後続の `toBeVisible()` は短い timeout（`expect.timeout` の 10s）で十分になる。

## 受け入れ条件

- [ ] `items.spec.ts` の reload 後待機に `waitForLibraryReady` が使われている
- [ ] `toBeVisible` の explicit timeout が不要になっている（`expect.timeout: 10_000` で十分）
- [ ] `pnpm exec biome check tests/e2e/items.spec.ts` がエラーなし
