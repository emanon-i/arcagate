---
id: PH-20260423-132
title: visual.spec.ts / layout.spec.ts — waitForTimeout 削減
status: todo
batch: 28
priority: low
created: 2026-04-23
scope_files:
  - tests/e2e/visual.spec.ts
  - tests/e2e/layout.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`visual.spec.ts` に `waitForTimeout(500)` が 3 箇所、
`layout.spec.ts` に `waitForTimeout(500)` が 1 箇所残っている。
これらはスクリーンショット取得前の安定待機として使われているが、
代わりに `waitForLoadState('networkidle')` や特定要素の可視性確認で代替可能。

## 実装内容

- `visual.spec.ts`: スクリーンショット前の `waitForTimeout(500)` を
  `waitForLoadState('networkidle')` または対象要素の `toBeVisible()` に変換
- `layout.spec.ts`: `waitForTimeout(500)` の除去または最小化

## 受け入れ条件

- [ ] `visual.spec.ts` の `waitForTimeout` が削減されること
- [ ] `layout.spec.ts` の `waitForTimeout` が削減されること
- [ ] biome 0 errors
