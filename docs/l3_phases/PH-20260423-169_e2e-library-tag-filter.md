---
status: done
phase_id: PH-20260423-169
title: "E2E: Library タグフィルター操作テスト"
scope_files:
  - tests/e2e/library.spec.ts
parallel_safe: true
depends_on: []
---

## 目的

Library のタグフィルター操作（フィルター選択→表示絞り込み）を E2E で検証する。
既存の `library.spec.ts` にテストを追加する。

## 受け入れ条件

| # | 条件                                                               |
| - | ------------------------------------------------------------------ |
| 1 | `Library タグフィルター` describe ブロックを追加                   |
| 2 | IPC でアイテムとタグを作成し、タグフィルターで絞り込めることを検証 |
| 3 | フィルター解除で全件に戻ることを検証                               |
| 4 | クリーンアップ（finally）で作成データを削除                        |

## 実装メモ

- `tests/e2e/library-tag-filter.spec.ts` として既に 2 テスト実装済み（基本フィルター + レース対応）
- 新規実装不要。done として処理
