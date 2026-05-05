---
id: PH-20260423-126
title: E2E テストの waitForTimeout をより安定した待機条件に置き換え
status: todo
batch: 27
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/workspace-editing.spec.ts
  - tests/e2e/widget-context-panel.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`waitForTimeout(300)` / `waitForTimeout(500)` は固定時間待機であり、
CI 環境の負荷状態によってフレーク（断続的失敗）を引き起こす原因となる。
Playwright の推奨パターン（`expect().toBeVisible()` / `waitForSelector`）に
置き換えることでテストを安定させる。

## 実装内容

以下の置き換えパターンを適用:

```typescript
// Before（フレーク原因）
await page.waitForTimeout(300);
await expect(element).toBeVisible();

// After（安定）
await expect(element).toBeVisible();  // 内部的に待機する
```

また、D&D 操作後の `waitForTimeout(300)` は DOM 変化のアサーションに変換:

```typescript
// Before
await simulateDragDrop(...);
await page.waitForTimeout(300);

// After
await simulateDragDrop(...);
await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(n);
```

## 対象

- `workspace-editing.spec.ts` の `waitForTimeout` 呼び出し
- `widget-context-panel.spec.ts` の `waitForTimeout` 呼び出し

## 受け入れ条件

- [ ] 対象ファイルから `waitForTimeout` の利用が 0 件または最小限になること
- [ ] テストが引き続き通過すること
- [ ] biome 0 errors
