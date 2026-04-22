---
id: PH-20260422-064
title: workspaceStore createWorkspace / updateWorkspace テスト追加
status: done
batch: 13
---

## 目的

createWorkspace（seedDefaultWidgets 経路含む）と updateWorkspace のテストを追加。

## 受け入れ条件

- createWorkspace() → workspaces +1, activeWorkspaceId 設定, widgets 3件（seed済み）
- updateWorkspace() → workspaces 配列内の name が更新される

## 検証

- pnpm verify 通過
