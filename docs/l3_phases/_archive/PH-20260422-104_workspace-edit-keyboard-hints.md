---
id: PH-20260422-104
title: Workspace 編集モード キーボードヒントバー
status: done
batch: 23
priority: medium
created: 2026-04-22
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

batch-21 (PH-098) で Canvas 風 UX を追加したが、編集モードで使えるキーボード操作
（Esc で終了・Delete でウィジェット削除）がユーザーに伝わりにくい。
UI 内にヒントを表示することで操作の発見性を高める。

## 実装内容

`WorkspaceLayout.svelte` の編集モード中に、ワークスペースコンテナ下部に
固定のヒントバーを表示する:

```svelte
{#if editMode}
  <div class="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-20
              flex items-center gap-4 rounded-full px-4 py-1.5
              bg-[var(--ag-surface-opaque)]/90 backdrop-blur-sm
              text-xs text-[var(--ag-text-muted)]">
    <span><kbd class="font-mono">Esc</kbd> 終了</span>
    <span class="opacity-40">|</span>
    <span><kbd class="font-mono">Del</kbd> 削除</span>
    {#if selectedWidgetId}
      <span class="opacity-40">|</span>
      <span class="text-[var(--ag-accent)]">1件選択中</span>
    {/if}
  </div>
{/if}
```

ヒントバーは `pointer-events-none` にしてドラッグ操作を妨げない。

### キーボードハンドラ追加

編集モード中の `Delete` / `Backspace` キーで選択ウィジェットを削除:

```typescript
function handleKeyDown(e: KeyboardEvent) {
  if (!editMode) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWidgetId) {
    e.preventDefault();
    // 選択ウィジェット削除（既存の削除ロジックを呼ぶ）
    handleRemoveWidget(selectedWidgetId);
    selectedWidgetId = null;
  }
  if (e.key === 'Escape') {
    cancelEdit();
  }
}
```

ページレベルの `onkeydown` はすでに Esc ハンドラがある場合は統合する。

## 受け入れ条件

- [ ] 編集モード時にヒントバーが表示されること（Esc / Del の説明）
- [ ] 非編集モード時はヒントバーが非表示であること
- [ ] ウィジェット選択中は「1件選択中」が表示されること
- [ ] Delete キーで選択ウィジェットが削除されること
- [ ] ヒントバーがウィジェットのドラッグ操作を妨げないこと（pointer-events-none）
- [ ] `pnpm verify` 全通過
