---
status: wip
phase_id: PH-20260423-192
title: D&D ドロップハンドラをインライン化（リグレッション修正）
category: バグ修正
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: false
depends_on: []
---

## 目的

実機で Workspace の D&D（ウィジェット追加・移動）が動作しない。
E2E は合成イベントで通過しているが、ネイティブドラッグでは `dragover.preventDefault()` が
`dropZoneEl` の祖先コンポーネントに届かない可能性がある（WebView2 の挙動差異）。

## 根本原因

現行実装では `dragover` / `drop` / `dragleave` イベントハンドラを
`WorkspaceLayout.svelte` の `$effect` 経由で `dropZoneEl` に後付けしている。

```
WorkspaceWidgetGrid.$effect → onDropZoneElChange(el)
  → dropZone = el (WorkspaceLayout $state)
    → WorkspaceLayout.$effect → el.addEventListener('dragover', ...)
```

WebView2 では `preventDefault()` が祖先経由でなく直接ターゲット要素で呼ばれることを
期待する挙動が確認されており、この間接登録が原因でドロップが無効化される。

## 変更方針

### WorkspaceWidgetGrid.svelte

1. Props から削除:
   - `movingWidget`, `dragOverCell`, `onMovingWidgetChange`,
     `onDragOverCellChange`, `onDropZoneElChange`
2. ローカル `$state` を追加:
   - `let movingWidget = $state<string | null>(null)`
   - `let dragOverCell = $state<{ x: number; y: number } | null>(null)`
3. ローカル関数を追加:
   - `calcGridPosition(e: DragEvent): { x: number; y: number }`
   - `handleDragOver(e: DragEvent)` — `e.preventDefault()` + `dropEffect` 設定
   - `handleDrop(e: DragEvent)` — `getData` で type/moveId 判定
   - `handleDragLeave(e: DragEvent)` — `relatedTarget` チェックで範囲外のみクリア
4. `data-testid="workspace-drop-zone"` に `ondragover` / `ondrop` / `ondragleave` を直接付与
5. `$effect(() => { onDropZoneElChange(dropZoneEl); })` を削除
6. `dragMoveWidget` action 内で `onMovingWidgetChange` 呼び出しをローカル state 直接代入に変更
7. `ondragstart={(e) => e.stopPropagation()}` をドラッグハンドルから削除（不要）
8. `effectAllowed` / `dropEffect` を設定してブラウザカーソルをネイティブ表示

### WorkspaceLayout.svelte

1. `movingWidget`, `dragOverCell`, `dropZone` state を削除
2. `calcGridPosition`, `handleDragOver`, `handleDrop`, `handleDragLeave` 関数を削除
3. `$effect` for drag listeners を削除
4. `<WorkspaceWidgetGrid>` から削除した Props を外す

## 検証

- `pnpm verify` 全通過
- 実機: 編集モードでサイドバーからウィジェットをドラッグ → グリッドにドロップ → 追加される
- 実機: ドラッグハンドルでウィジェットを移動 → 正しい位置に移動 → リロード後も維持
