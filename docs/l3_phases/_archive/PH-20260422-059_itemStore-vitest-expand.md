---
id: PH-20260422-059
title: itemStore vitest 拡充（updateItem / loadTags / error state）
status: done
batch: 12
---

## 目的

`items.svelte.test.ts` に 4 テスト追加（4→8件）。updateItem・loadTags・IPC エラー状態を網羅。

## 受け入れ条件

- `updateItem()` → items 配列内の label が更新される
- `loadTags()` → tags 配列に結果が格納される
- `loadItems()` IPC エラー → `error` state に文字列が入る
- `updateItem()` IPC エラー → `error` state に文字列が入る

## 検証

- pnpm verify 通過
- vitest 95/95 通過
