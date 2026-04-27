---
id: PH-20260428-496
title: ウィジット切り替えボタン = 左上に固定配置
status: done
batch: 108
pr: 191
merged_at: 2026-04-27T16:44:07Z
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte
---

# PH-496: ウィジット切り替えボタン左上固定

## 背景

ユーザー dev fb (2026-04-28):

> ウィジットの切り替えのボタン。これ左上に固定にしてね。

「ウィジット切り替え」= 編集モード切替 / Workspace タブ切替 等の主要 toggle button。
浮遊位置じゃなく **左上固定** で常に同じ場所に。

## 受け入れ条件

- [ ] **左上固定**: WorkspaceLayout の編集モード toggle button を `absolute top-3 left-3 z-20` で固定
  - 現状 WorkspaceSidebar 内に押し込まれている可能性
- [ ] **編集モード時もキャンバス transform 影響受けない**: position: fixed 相当で canvas pan/zoom (PH-494) に追従しない
- [ ] **キーボード**: Tab で focus 可能、focus visible 強化
- [ ] **PH-473 Crop ボタン (右下 floating)** と排他なし (左上 vs 右下で別位置)

### SFDIPOT

- F: 編集モード切替 button が常に左上に存在
- I: WorkspaceLayout のレイアウトを `relative` 化、button を `absolute top-3 left-3`
- P: window resize でも左上維持

## 実装ステップ

1. WorkspaceLayout.svelte の編集モード toggle button 配置場所確認
2. button を sidebar から取り出して WorkspaceLayout 直下に置く、`absolute top-3 left-3 z-20`
3. canvas pan/zoom (PH-494) と独立 (button は canvas transform の **外側**)
4. 既存 keyboard shortcut (e.g. 編集モード trigger) は維持

## 規約参照

- HICCUPPS [Image, Consistency] 「主要 toggle は固定位置」UX (Figma / VSCode 慣習)
- ux_standards.md (固定 UI 要素の z-index 階層)
