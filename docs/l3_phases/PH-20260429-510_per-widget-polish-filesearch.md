---
id: PH-20260429-510
title: Per-widget polish — FileSearch (batch-109 Phase B)
status: todo
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/file-search/FileSearchWidget.svelte
---

# PH-510: Per-widget polish — FileSearch

## 共通品質 checklist

`docs/l3_phases/_batch-109-phase-b-checklist.md` 参照、全項目 PASS が完走条件。

## 個別注意点

PH-493 fix を本格 polish、sticky search bar、ArrowUp/Down + Enter、IME 対応

## 実装ステップ

1. 現状 widget の主要操作 / 状態を列挙
2. S/M/L サイズで responsive 設計 (container query)
3. 全状態 (hover/focus/pressed/disabled/selected/loading/error) を表現
4. keyboard ナビ実装
5. E2E 1 シナリオ追加
6. before/after スクショ取得

## 規約参照

- `_batch-109-phase-b-checklist.md`
- ux_standards.md
- engineering-principles §6 SFDIPOT
