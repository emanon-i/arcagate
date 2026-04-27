---
id: PH-20260427-478
title: Widget 編集の状態管理整理 (draft / committed 分離)
status: todo
batch: 107
era: polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/state/workspace.svelte.ts
  - src/lib/state/workspace-edit.svelte.ts (new)
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte
---

# PH-478: Widget 編集の状態管理整理 (draft / committed 分離)

## 背景

ユーザー dev fb (2026-04-27):

> 編集で編集したガチャガチャしてキャンセルしてまた編集すると前のが戻ったりする。状態管理大丈夫？

現状調査 (workspace.svelte.ts:270-301):

- `optimisticMoveAndResize()` / `optimisticResize()` が直接 `widgets` $state を書き換え
- `persistMoveAndResize()` で IPC 永続化
- **draft state なし**: optimistic 書き換えがそのまま widgets の真の値になる
- WidgetSettingsDialog は config を直接編集して保存
- 「キャンセル」概念がない (編集モード抜けても optimistic 変更が残る、IPC 失敗時 rollback はあるが UI 状態は中途)
- 「再編集で前のが戻る」原因: optimistic 値が中途半端に commit された状態で start、その上に新しい編集が乗ると mix する

## 受け入れ条件

### 機能

- [ ] **編集セッション開始時 snapshot**: editMode true 化 / SettingsDialog open 時に `committed` snapshot を保持
- [ ] **編集中の操作は draft のみ更新**: drag / resize / config 変更は draft state へ書き込み、widget 表示は draft 優先 (`derived(draft ?? committed)`)
- [ ] **Apply / 自動 commit**: Settings ダイアログの「保存」or pointerup の確定 (move/resize) で draft → committed + IPC
- [ ] **Cancel**: ダイアログ ✕ / Esc / 編集モード off で draft 破棄 → 完全 revert
- [ ] **再編集**: 必ず committed から開始、過去 draft は完全に消える
- [ ] **dirty indicator**: SettingsDialog に未保存マーク (`*` or dot)、未保存で閉じようとすると確認 dialog
- [ ] **PH-477 連携**: 確定操作のみ history に積む (draft の途中状態は積まない)
- [ ] E2E: 「編集 → キャンセル → 再編集」シナリオで前 draft が残らないこと、「編集 → 保存 → 再編集 → キャンセル」で 1 回目の保存値で start、ガチャガチャ後にキャンセルで 1 回目保存値に戻る

### 横展開チェック

- [ ] Theme editor / Library card の編集系も同パターン適用可能か (今 scope 外、設計の伝播余地)
- [ ] Settings 全般で「Apply / Cancel」UX が混在していないか grep audit

### SFDIPOT

- **F**unction: draft / committed の状態遷移が明確、再編集で混ざらない
- **D**ata: `WidgetEditSession = { committed: Snapshot, draft: Snapshot | null, dirty: boolean }`
- **I**nterface: `workspace-edit.svelte.ts` の `start(widgetId)` `update(patch)` `commit()` `cancel()` API
- **P**latform: Esc / ✕ / outside click すべて cancel ハンドリング
- **T**ime: commit は IPC 1 回でブロッキング、cancel は IPC 不要で instant

### HICCUPPS

- [Image] Figma / Photoshop 等の「編集 → 保存 / キャンセル」フロー
- [User] 「キャンセルして再編集で前のが戻る」現象が消える
- [Consistency] PH-477 undo/redo と整合 (cancel = 全 draft 操作の集合 undo に相当)

## 実装ステップ

1. `workspace-edit.svelte.ts` (new): `EditSession` state + start / update / commit / cancel API
2. `workspace.svelte.ts`: optimistic 系を edit session の draft に書き込む形に refactor、widgets の derived 計算で draft 優先
3. WorkspaceWidgetGrid.svelte の resize / move / config 編集を edit session 経由に変更
4. WidgetSettingsDialog.svelte に dirty indicator + 未保存確認 dialog
5. WorkspaceLayout.svelte の editMode toggle off 時に edit session cancel/commit を整理
6. PH-477 history 連携: commit() で history.record(before, after)
7. E2E: 「編集 → キャンセル → 再編集」「編集 → ガチャガチャ → キャンセル → 再編集」のシナリオを 2 件追加

## 規約参照

- engineering-principles §3 (エラー時 rollback の延長)
- ux_standards.md (キャンセルパターンの一貫性)
- lessons.md「Svelte 5 $effect の依存追跡」(draft / committed の reactivity 設計に注意)

## 参考

- workspace.svelte.ts:270-301 (optimistic 系の現状実装)
- PH-477 undo/redo (commit タイミング共有)
