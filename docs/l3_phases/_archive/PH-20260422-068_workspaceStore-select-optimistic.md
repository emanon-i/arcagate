---
id: PH-20260422-068
title: workspaceStore selectWorkspace / optimisticResize テスト追加
status: done
batch: 13
---

## 目的

selectWorkspace と optimisticResize の動作テストを追加。

## 受け入れ条件

- selectWorkspace() → activeWorkspaceId 変更 + widgets 再ロード
- optimisticResize() → IPC なしで widgets のサイズが同期更新される

## 検証

- pnpm verify 通過
