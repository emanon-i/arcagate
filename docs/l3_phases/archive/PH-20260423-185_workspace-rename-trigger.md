---
status: done
phase_id: PH-20260423-185
title: WorkspaceRenameDialog renameOpen トリガー追加（整理）
category: 整理
scope_files:
  - src/lib/components/arcagate/workspace/PageTabBar.svelte
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: true
depends_on: []
---

## 目的

`renameOpen` が `true` にセットされる箇所が存在せず WorkspaceRenameDialog が使えない状態を修正する。PageTabBar のアクティブワークスペースタブにダブルクリックでリネームを開始するトリガーを追加する。

## 変更内容

### PageTabBar.svelte

- `onRenameActive?: () => void` prop を追加
- アクティブワークスペースの `Chip` に `ondblclick={() => onRenameActive?.()}` を追加
- ホバー時に表示される小さな Pencil ボタンを `Chip` の右横に追加（`onclick` で `onRenameActive?.()`）

### WorkspaceLayout.svelte

- `PageTabBar` に `onRenameActive={() => (renameOpen = true)}` を渡す

## 検証

- `pnpm verify` グリーン
- 手動確認: ワークスペースタブをダブルクリックするとリネームダイアログが開くこと
