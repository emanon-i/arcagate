---
id: PH-20260422-058
title: launch.ts invoke 型パラメータ明示
status: done
batch: 11
priority: low
---

## 背景・目的

`src/lib/ipc/launch.ts` の `searchItems` と `launchItem` が `invoke()` を
ジェネリック型パラメータなしで呼んでいた。他の IPC ファイルと統一するため明示する。

## 受け入れ条件

- [x] `searchItems`: `invoke('cmd_search_items', ...)` → `invoke<Item[]>('cmd_search_items', ...)`
- [x] `launchItem`: `invoke('cmd_launch_item', ...)` → `invoke<void>('cmd_launch_item', ...)`
- [x] `pnpm verify` 全通過

## 実装メモ

- 他の IPC ファイル（items.ts, config.ts, workspace.ts, theme.ts）はすべて型パラメータ付き
- この 2 関数のみ漏れていた
