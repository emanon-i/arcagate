---
id: PH-20260422-060
title: workspaceStore IPC テスト追加（loadWorkspaces / removeWidget / addWidget）
status: done
batch: 12
---

## 目的

`workspace.svelte.test.ts` に IPC 統合テストブロックを追加（loadWorkspaces・removeWidget・addWidget）。

## 受け入れ条件

- `loadWorkspaces()` → workspaces / activeWorkspaceId / widgets が設定される
- `removeWidget()` → widgets 配列から該当 ID が除去される
- `addWidget()` → widgets 配列に追加される（findFreePosition 経由）

## 検証

- pnpm verify 通過
- vi.resetModules() パターンで各テストが独立した $state を保持
