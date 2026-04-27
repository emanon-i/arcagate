---
id: PH-20260427-477
title: Widget Undo/Redo system (Ctrl+Z / Ctrl+Shift+Z)
status: done
batch: 107
era: polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/state/workspace-history.svelte.ts (new)
  - src/lib/state/workspace.svelte.ts
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/HelpPanel.svelte (or equivalent)
---

# PH-477: Widget Undo/Redo System

## 背景

ユーザー dev fb (2026-04-27):

> あと削除が取り返せないのも謎だしアンドゥリドゥ無いの今時じゃないね。

現状:

- widget 配置 / 移動 / リサイズ / 追加 / 削除 / config 変更すべて IPC 即書き込み
- undo / redo 機構なし
- 確認ダイアログで削除 (PH-003-F5 で導入済) のみ

## 受け入れ条件

### 機能

- [x] **Ctrl+Z**: workspace.svelte.ts の add/remove/move/resize/config を `workspaceHistory.record()` で wrap、Ctrl+Z で 1 件 undo
- [x] **Ctrl+Shift+Z または Ctrl+Y**: redo (両方サポート、Adobe / Office 慣習)
- [x] **履歴上限**: 50 件 ring buffer (`MAX_HISTORY = 50`、超過時 `slice(-MAX_HISTORY)` で drop)
- [x] **編集中は履歴に積まない**: `optimisticMoveAndResize` は record せず、pointerup の `commitMoveAndResize` でのみ record
- [x] **新規操作で redo invalidate**: record 時に `redoStack = []` (Adobe 慣習)
- [x] **永続化**: session memory only (DB 不使用、再起動リセット)
- [x] **HelpPanel** に「Ctrl+Z 取り消し / Ctrl+Shift+Z やり直し」追記 + tip 追加
- [x] **エラー時 rollback**: try-catch + `console.error('[history] undo failed', e)`、history pointer 維持
- [x] **add/remove の id 変化**: Rust 側で新 id 生成されるので、redo/undo 後 entry.widgetId を update

### 横展開チェック

- [x] Library / Theme editor: scope 外、design pattern (kind + before/after) は将来 history 化に再利用可能
- [x] config 変更も undo 対象 (updateWidgetConfig wrapper で record)

### SFDIPOT

- **F**unction: undo で完全に前状態に戻る (見た目 + DB)
- **D**ata: history entry = `{ kind: 'add'|'remove'|'move'|'resize'|'config', before: snapshot, after: snapshot }`
- **I**nterface: workspace.svelte.ts の操作系を全て `recordHistory()` 経由に
- **P**latform: keyboard shortcut binding (既存 keybinding helper 使用)
- **T**ime: undo / redo は instant (IPC 1 回程度、ユーザーが連打しても OK)

### HICCUPPS

- [Image, User] OS / Office / Adobe / Figma の Ctrl+Z 標準
- [Comparable] Notion / VSCode の undo 体感
- [Consistency] Library / Theme editor も将来同じパターン

## 実装ステップ

1. `workspace-history.svelte.ts` (new): `HistoryEntry` 型 + `record(entry)` / `undo()` / `redo()` API、ring buffer 50
2. `workspace.svelte.ts`: 既存 add/remove/move/resize/updateConfig を `recordHistory` でラップ (before/after snapshot)
3. WorkspaceLayout.svelte に keyboard listener 追加: Ctrl+Z → workspaceHistory.undo()、Ctrl+Shift+Z → redo
4. undo の実装: `before` snapshot を IPC で再書き込み (例: undo move → 元位置に moveWidget IPC)
5. add の undo は remove IPC、remove の undo は add + position 復元 IPC、config の undo は updateConfig IPC
6. HelpPanel にショートカット追記
7. E2E: widget 追加 → undo → 消える / 削除 → undo → 復元 / 移動 → undo → 戻る / Ctrl+Shift+Z で redo

## 規約参照

- ux_standards.md keyboard shortcut conventions
- engineering-principles §3 (エラー伝播 + rollback)
- HelpPanel に必ず追記 (CLAUDE.md「同じ機能には同じ表現」)

## 参考

- workspace.svelte.ts (操作系を全部ラップ対象)
- pointer-drag.svelte.ts (drag 完了 = commit タイミング)
