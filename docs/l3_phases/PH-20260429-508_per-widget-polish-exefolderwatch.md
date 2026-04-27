---
id: PH-20260429-508
title: Per-widget polish — ExeFolderWatch (batch-109 Phase B)
status: todo
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte
---

# PH-508: Per-widget polish — ExeFolderWatch

## 共通品質 checklist

`docs/l3_phases/_batch-109-phase-b-checklist.md` 参照、全項目 PASS が完走条件。

## 個別注意点

- PH-490/492 fix を本格 polish、file row layout = icon (shrink-0 h-4 w-4) + name (flex-1 truncate)、空 state UI
- **アイコン変更必須** (user fb 2026-04-28): widget header / registry / file row の icon を **`Folder` → `AppWindow`** に変更
  - 「EXE / アプリらしい」icon、`Folder` icon は **NG**
  - widget meta (`src/lib/widgets/exe-folder/index.ts` の icon export) も `AppWindow`
  - 個別 EXE item の row icon も同様 (アプリ起動可能感を出す)
  - 候補: `AppWindow` (最有力) / `MonitorPlay` / `Play`

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
