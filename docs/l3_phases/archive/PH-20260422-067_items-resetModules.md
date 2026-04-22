---
id: PH-20260422-067
title: itemStore テストに vi.resetModules() を追加（状態分離強化）
status: done
batch: 13
---

## 目的

items.svelte.test.ts の beforeEach に vi.resetModules() を追加。
テスト間の $state 漏れを防ぎ、順序依存バグを排除。

## 理由

vi.resetModules() なしでは全テストが同一モジュールインスタンスを共有し、
tagWithCounts / libraryStats の初期値依存テストが順序変更で壊れる可能性があった。

## 検証

- pnpm verify 通過（103テスト全通過）
