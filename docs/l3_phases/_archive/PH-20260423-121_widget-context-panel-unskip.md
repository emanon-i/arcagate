---
id: PH-20260423-121
title: widget-context-panel.spec.ts の test.skip() 解消
status: todo
batch: 26
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/widget-context-panel.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`tests/e2e/widget-context-panel.spec.ts` に `test.skip()` されたテストが残っている。
スキップされたテストは CI で検出されず、機能デグレードを見逃すリスクがある。
テストを修正して有効化するか、削除して別のテストで代替する。

## 実装内容

1. `widget-context-panel.spec.ts` の `test.skip()` 箇所を調査
2. スキップ理由を特定（実装未完・フラッキー・セレクタ不一致など）
3. 対処方針:
   - 実装済みなら: セレクタを修正して `test.skip` を外す
   - 未実装なら: テストを削除し、代わりに実装済み機能の検証テストを追加
   - フラッキーなら: 待機条件を改善して安定化

## 受け入れ条件

- [ ] `test.skip()` が 0 件になること（または合理的な理由でコメントアウト）
- [ ] 追加・修正したテストが通過すること
- [ ] `pnpm test:e2e --grep widget-context` でテストが実行されること
