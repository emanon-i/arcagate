---
status: todo
phase_id: PH-20260422-014
title: Widget D&D 配置修復（calcGridPosition 基準修正 + 専用ドラッグハンドル）
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: true
---

# PH-20260422-014: Widget D&D 配置修復

## 目的

Workspace の編集モードでウィジェットを D&D 配置できない問題を修正する。

根本原因は 2 点:

1. `calcGridPosition` が `workspaceContainer`（PageTabBar / Tip を含む外側コンテナ）を基準にしているため、y 座標がグリッド上端からのオフセット分ずれる
2. ウィジェット div 全体に `draggable="true"` が付いているが内部はインタラクティブ要素で埋まっており、既存ウィジェットのドラッグ開始点がない

## 設計判断

- `calcGridPosition` を `dropZone.getBoundingClientRect()` 基準に変更（scrollLeft/Top 補正は不要 — getBoundingClientRect は viewport 相対で `e.clientX/Y` と同系）
- ウィジェット div から `draggable="true"` と `use:dragMoveWidget` を外す
- 代わりに専用ドラッグハンドル div（`cursor-grab`、GripVertical アイコン）を left-1 top-1 に配置し、そこだけを `draggable="true"` にする
- ドラッグハンドルは編集モード中のみ表示（`{#if editMode}` に包む必要はない — 既にウィジェット全体が editMode 内）

## 実装ステップ

### Step 1: calcGridPosition を dropZone 基準に修正

`WorkspaceLayout.svelte` の `calcGridPosition` を以下に書き換える:

```ts
function calcGridPosition(e: DragEvent): { x: number; y: number } {
    const ref = dropZone;
    if (!ref) return { x: 0, y: 0 };
    const rect = ref.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const gap = 16;
    const cellW = widgetW + gap;
    const cellH = widgetH + gap;
    const x = Math.max(0, Math.min(dynamicCols - 1, Math.floor(relX / cellW)));
    const y = Math.max(0, Math.floor(relY / cellH));
    return { x, y };
}
```

`workspaceContainer` 参照と scrollLeft/Top 補正を削除。

### Step 2: ウィジェット div のドラッグを専用ハンドルに限定

編集モードのウィジェット div（`role="group"` のもの）を:

1. `draggable="true"` を削除
2. `use:dragMoveWidget={widget.id}` を削除
3. 子要素として専用ドラッグハンドルを追加（削除ボタンの隣、または top-1 left-1）:

```svelte
<!-- ドラッグハンドル -->
<div
    class="absolute left-1 top-1 flex h-6 w-6 cursor-grab items-center justify-center rounded-sm bg-[var(--ag-surface-4)]/80 hover:bg-[var(--ag-surface-4)]"
    draggable="true"
    use:dragMoveWidget={widget.id}
    aria-label="ウィジェットを移動"
    ondragstart={(e) => e.stopPropagation()}
>
    <GripVertical class="h-3 w-3 text-[var(--ag-text-muted)]" />
</div>
```

削除ボタン（right-1 top-1）とドラッグハンドル（left-1 top-1）は干渉しない。

### Step 3: pnpm verify

## コミット規約

`fix(PH-20260422-014): Widget D&D 配置修復（calcGridPosition + 専用ドラッグハンドル）`

## 受け入れ条件

- [ ] 編集モードで各ウィジェットの左上にドラッグハンドルが表示される
- [ ] サイドバーからウィジェットをグリッドにドラッグ&ドロップすると、ドロップ位置のセルに配置される（row ずれなし）
- [ ] 既存ウィジェットのドラッグハンドルをつかんで別セルにドラッグすると移動できる
- [ ] `pnpm verify` 通過

## 停止条件

- `dropZone` が null のまま（editMode 切替時に bind:this が更新されない）→ 停止して報告
