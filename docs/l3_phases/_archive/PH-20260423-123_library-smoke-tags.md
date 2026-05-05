---
id: PH-20260423-123
title: library-search / library-detail.spec.ts に @smoke タグ追加
status: todo
batch: 27
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/library-search.spec.ts
  - tests/e2e/library-detail.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

Library タブの主要操作（検索・詳細パネル表示）が PR 時の E2E（`@smoke` のみ実行）で
検証されていない。`items.spec.ts` や `workspace.spec.ts` は smoke 対象になっているが
Library タブが未対応のまま。

## 実装内容

### `library-search.spec.ts`

- 「検索クエリでアイテムが絞り込まれること」または同等テストに `{ tag: '@smoke' }` を追加

### `library-detail.spec.ts`

- 「閉じるボタンでパネルが閉じること」テストに `{ tag: '@smoke' }` を追加

## 受け入れ条件

- [ ] `library-search.spec.ts` に `@smoke` テストが 1 件以上存在すること
- [ ] `library-detail.spec.ts` に `@smoke` テストが 1 件以上存在すること
- [ ] `pnpm test:e2e --grep @smoke` で Library 関連テストが含まれること
