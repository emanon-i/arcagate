---
id: PH-20260423-113
title: WorkspaceSidebar ドラッグゴースト追加
status: done
batch: 25
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

`WorkspaceSidebar.svelte` の `dragWidget` アクションはブラウザデフォルトのゴースト（要素コピー）を使用。
`WorkspaceWidgetGrid.svelte` の `dragMoveWidget` はカスタムゴーストを `setDragImage` で設定しており、
2 つの drag 操作の見た目が一致していない。

## 実装内容

`dragWidget` の `dragstart` ハンドラに、`dragMoveWidget` と同様のカスタムゴースト生成を追加する。

```typescript
let handler = (e: DragEvent) => {
  e.dataTransfer?.setData('widget-type', widgetType);
  const ghost = document.createElement('div');
  ghost.style.cssText =
    'position:fixed;top:-200px;left:-200px;width:72px;height:36px;background:var(--ag-accent);opacity:0.75;border-radius:8px;pointer-events:none;';
  document.body.appendChild(ghost);
  e.dataTransfer?.setDragImage(ghost, 36, 18);
  requestAnimationFrame(() => ghost.remove());
};
```

`update` ハンドラにも同じゴースト生成を追加すること（`dragMoveWidget` の update バグを繰り返さないよう）。

## 受け入れ条件

- [ ] `dragWidget` の `startHandler` にカスタムゴーストが追加されていること
- [ ] `update` ハンドラにも同様のゴーストが追加されていること
- [ ] biome / svelte-check 0 errors
