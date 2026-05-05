---
id: PH-20260423-128
title: library-tag-filter.spec.ts — @smoke タグ追加 + waitForTimeout 削減
status: todo
batch: 28
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/library-tag-filter.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`library-tag-filter.spec.ts` には `@smoke` タグがなく PR E2E で検証されない。
また `waitForTimeout(300/500)` が 4 箇所あり CI の負荷状況によりフレーク原因となる。

## 実装内容

1. タグフィルタの主要テスト（タグ選択でアイテムが絞り込まれること等）に `{ tag: '@smoke' }` を追加
2. `waitForTimeout(300/500)` を `expect(...).toBeVisible()` または `expect(...).not.toBeVisible()` に置き換え

デバウンス待機が本質的に必要な箇所は短い `waitForTimeout` を維持してよい。

## 受け入れ条件

- [ ] 少なくとも 1 件のテストに `@smoke` タグが追加されること
- [ ] `waitForTimeout` の件数が 0〜1 件まで削減されること
- [ ] biome 0 errors
