---
id: PH-20260422-065
title: workspaceStore resizeWidget / updateWidgetConfig テスト追加
status: done
batch: 13
---

## 目的

resizeWidget と updateWidgetConfig の IPC 統合テストを追加。

## 受け入れ条件

- resizeWidget() → widget の width/height が更新される
- updateWidgetConfig() → widget の config が更新される

## 検証

- pnpm verify 通過
