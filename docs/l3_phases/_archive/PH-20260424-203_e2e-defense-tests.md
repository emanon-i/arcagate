---
id: PH-20260424-203
title: E2E 防衛テスト追加（PointerEvent D&D + ズームスライダー）
status: done
priority: medium
parallel_safe: true
scope_files:
  - tests/e2e/workspace-editing.spec.ts
---

## 背景

batch-42 で PointerEvent D&D を実装。E2E でカバー済みだが、
ズームスライダーの動作確認テストが存在しない。

## 変更内容

1. ズームスライダーテスト追加:
   - Settings を開く → ズームスライダーを動かす → ウィジェット DOM サイズが変わることを確認

2. D&D add テストの @smoke タグ付け:
   - 既存の D&D テストを `@smoke` でマークして CI スモークテストに含める

## 受け入れ条件

- `pnpm test:e2e` でズームスライダーテストが通る
