---
status: wip
phase_id: PH-20260423-178
title: LibraryDetailPanel + Dialog cancel ボタン focus-visible / active:scale 追加
category: 改善
scope_files:
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
  - src/lib/components/arcagate/workspace/WorkspaceDeleteConfirmDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceRenameDialog.svelte
parallel_safe: true
depends_on: []
---

## 目的

LibraryDetailPanel の3ボタン（パネル閉じる・タグ追加・デフォルトアプリ）と、Dialog の cancel ボタン2件に focus-visible を追加。また Dialog cancel ボタンに active:scale-[0.97] を追加してプレスフィードバックを統一する。

## 変更内容

### LibraryDetailPanel.svelte（3箇所）

- パネル閉じるボタン (line ~200)
- タグ追加トリガーボタン (line ~252)
- デフォルトアプリ選択ボタン (line ~290)

追加クラス: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]`

### WorkspaceDeleteConfirmDialog.svelte（cancel ボタン）

追加クラス: `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]`

### WorkspaceRenameDialog.svelte（cancel ボタン）

追加クラス: `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]`

## 検証

- `pnpm verify` グリーン
- 手動確認: 各ボタンにキーボードフォーカスするとリング表示、クリック時に scale アニメーション
