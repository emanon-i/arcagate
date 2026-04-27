---
id: PH-20260428-495
title: Settings からズーム項目削除 (編集モード内に統合)
status: todo
batch: 108
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/settings/AppearanceSettings.svelte
  - src/lib/components/settings/WorkspaceSettings.svelte (該当箇所)
---

# PH-495: Settings からズーム項目削除

## 背景

ユーザー dev fb (2026-04-28):

> ズームも設定画面にいる必要ないな。

PH-494 の Obsidian Canvas zoom (Ctrl+wheel + 右側 toolbar) で zoom UX が完結。
Settings 内の widget zoom slider は冗長、削除して編集モード内に統合。

## 受け入れ条件

- [ ] Settings (Appearance or Workspace) の widget zoom slider 削除
- [ ] zoom 設定値は **編集モード canvas の scale** に統合 (PH-494 と整合)
- [ ] 既存 `configStore.widgetZoom` は **後方互換維持** (旧設定値 100 として default、削除しない)
- [ ] migration: 既存 user の設定値は無視 (default 100)、新 zoom は canvas state へ

### SFDIPOT

- F: Settings に zoom UI なし、編集モード内で zoom
- D: configStore.widgetZoom は legacy として残置 (削除すると Rust DB schema 不整合)
- O: 既存 user は再設定不要

## 実装ステップ

1. AppearanceSettings.svelte / WorkspaceSettings.svelte の zoom slider DOM 削除
2. 関連 import / state cleanup
3. 既存 widget rendering で `--widget-w/h` は config 100 base 計算のまま (legacy)、PH-494 で canvas scale 統合後は不要
4. dispatch-log に「ズーム設定 UI 削除済」記録

## 規約参照

- engineering-principles §8 ゲート G2 (スコープ削減 OK)
- HICCUPPS [Consistency] zoom UX は 1 箇所のみ
