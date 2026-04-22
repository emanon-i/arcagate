---
id: PH-20260423-135
title: widget-context-panel.spec.ts @smoke タグ追加
status: done
batch: 29
priority: low
created: 2026-04-23
scope_files:
  - tests/e2e/widget-context-panel.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`widget-context-panel.spec.ts` には `@smoke` タグがなく PR E2E で検証されない。
ウィジェットの右クリックコンテキストパネル（詳細表示 + Escape 閉じ）は
Workspace の基本 UX であるため smoke 対象にする。

## 実装内容

- 「右クリックでコンテキストパネルが表示され、Escape で閉じること」
  テストに `{ tag: '@smoke' }` を追加

## 受け入れ条件

- [ ] 少なくとも 1 件のテストに `@smoke` タグが追加されること
- [ ] biome 0 errors
