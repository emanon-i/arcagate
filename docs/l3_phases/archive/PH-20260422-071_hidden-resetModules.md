---
id: PH-20260422-071
title: hiddenStore テストに vi.resetModules() 追加
status: done
batch: 14
---

## 目的

hidden.svelte.test.ts の beforeEach に vi.resetModules() を追加し、状態分離を保証する。

## 検証

- pnpm verify 通過
