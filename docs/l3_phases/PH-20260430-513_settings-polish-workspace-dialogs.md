---
id: PH-20260430-513
title: Settings dialog polish — WorkspaceRenameDialog / WorkspaceDeleteConfirmDialog (batch-110 Phase C)
status: todo
batch: 110
era: settings-form-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/settings/
---

# PH-513: Settings dialog polish — WorkspaceRenameDialog / WorkspaceDeleteConfirmDialog

## 共通品質 checklist

`docs/l3_phases/_batch-110-phase-c-checklist.md` 参照、全項目 PASS が完走条件。

## 個別注意点

WorkspaceRenameDialog / WorkspaceDeleteConfirmDialog

## 実装ステップ

1. 現状 dialog の form 構造を確認
2. label / placeholder / 配置順 / 入力方式を検討
3. shadcn-svelte form pattern (label / description / message) で統一
4. validation / error state 整備
5. keyboard ナビ (Tab / Enter / Esc)
6. before/after スクショ取得

## 規約参照

- `_batch-110-phase-c-checklist.md`
- ux_standards.md (form design)
- shadcn-svelte form documentation
