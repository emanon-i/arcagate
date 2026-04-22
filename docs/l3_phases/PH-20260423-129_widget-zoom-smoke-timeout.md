---
id: PH-20260423-129
title: widget-zoom.spec.ts — @smoke タグ追加 + waitForTimeout 削減
status: todo
batch: 28
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/widget-zoom.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`widget-zoom.spec.ts` には `@smoke` タグがなく PR E2E で検証されない。
ウィジェットグリッドのズーム機能は UX の中核的な設定であるため smoke 対象にする。
また `waitForTimeout(300)` / `waitForTimeout(100)` が残っている。

## 実装内容

1. ズーム変更テスト（スライダー/ボタン操作でグリッドが変化する等）に `{ tag: '@smoke' }` を追加
2. `waitForTimeout` を DOM 変化のアサーションに置き換え

## 受け入れ条件

- [ ] 少なくとも 1 件のテストに `@smoke` タグが追加されること
- [ ] `waitForTimeout` の件数が削減されること
- [ ] biome 0 errors
