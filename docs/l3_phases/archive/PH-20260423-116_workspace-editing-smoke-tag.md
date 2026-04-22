---
id: PH-20260423-116
title: workspace-editing.spec.ts に @smoke タグ追加 + Delete キー削除フロー防衛
status: done
batch: 25
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/workspace-editing.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`workspace-editing.spec.ts` の既存 3 テストに `@smoke` タグが付与されていない。
PR 時は `@smoke` のみを実行するため、workspace 編集機能が PR の E2E で検証されない。

また、PH-104 で追加した Delete キーによる削除ダイアログ起動（`svelte:window onkeydown`）の
E2E テストがない。

## 実装内容

1. 既存テストのうち「ウィジェットを移動できること」または「ウィジェットが追加できること」に `@smoke` タグを追加
2. 新テスト「Delete キーでウィジェット削除ダイアログが開くこと」を追加:
   - ウィジェットをクリックして選択
   - `page.keyboard.press('Delete')` を実行
   - 削除確認ダイアログが表示されること（`aria-label="ウィジェットを削除しますか？"` or ダイアログテキスト）
   - Escape でキャンセルできること

## 受け入れ条件

- [ ] 少なくとも 1 つの既存テストに `{ tag: '@smoke' }` が追加されていること
- [ ] Delete キー削除ダイアログのテストが追加・通過していること
- [ ] `pnpm test:e2e --grep @smoke` で workspace-editing のテストが含まれること
