---
id: PH-20260423-131
title: library-empty-starred.spec.ts — waitForTimeout 削減 + @smoke タグ追加
status: todo
batch: 28
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/library-empty-starred.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`library-empty-starred.spec.ts` に `waitForTimeout(300)` が 4 箇所あり、
また `@smoke` タグがない。空の starred 状態は Library タブの重要な表示状態。

## 実装内容

1. 主要テスト（starred アイテムがない場合の空状態表示）に `{ tag: '@smoke' }` を追加
2. `waitForTimeout(300)` を DOM アサーション待機に置き換え

## 受け入れ条件

- [ ] 少なくとも 1 件のテストに `@smoke` タグが追加されること
- [ ] `waitForTimeout` の件数が削減されること
- [ ] biome 0 errors
