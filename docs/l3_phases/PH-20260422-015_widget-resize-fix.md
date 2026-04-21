---
status: todo
phase_id: PH-20260422-015
title: Widget リサイズ修復（pointer events + dragstart ブロック）
depends_on:
  - PH-20260422-014
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: false
---

# PH-20260422-015: Widget リサイズ修復

## 目的

編集モードでリサイズハンドルをドラッグしてもウィジェットサイズが変わらない問題を修正する。

**根本原因**: リサイズハンドル div の `onmousedown` が `document.mousemove` を登録するが、親ウィジェット div が `draggable="true"` だった（014 で修正後は不要になるが、残留した `dragstart` で HTML5 DnD が起動し `mousemove` を抑制するケースがある）。最も堅牢な修正は `mousedown/mousemove/mouseup` を `pointerdown/pointermove/pointerup` + `setPointerCapture` に切り替えること。

## 設計判断

- PH-20260422-014 でウィジェット div の `draggable` は外れるが、リサイズハンドル自体の `ondragstart` ブロックも追加して二重防護する
- `mouse events` → `pointer events` + `setPointerCapture` への切り替えが最も堅牢:
  - `setPointerCapture` により、マウスがハンドル外に出ても `pointermove` を受け取り続ける
  - HTML5 DnD と干渉しない（pointer events は DnD に関与しない）
- `document` へのリスナー登録は不要になる（`setPointerCapture` で代替）

## 実装ステップ

### Step 1: handleResizeStart を pointer events に切り替え

`WorkspaceLayout.svelte` の `handleResizeStart` を書き換える:

```ts
function handleResizeStart(e: PointerEvent, widgetId: string) {
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const widget = workspaceStore.widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    const startW = widget.width;
    const startH = widget.height;
    resizingWidget = widgetId;

    function onMove(ev: PointerEvent) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newW = Math.max(1, Math.min(MAX_SPAN, startW + Math.round(dx / widgetW)));
        const newH = Math.max(1, Math.min(MAX_SPAN, startH + Math.round(dy / widgetH)));
        workspaceStore.optimisticResize(widgetId, newW, newH);
    }

    function onUp(ev: PointerEvent) {
        handle.releasePointerCapture(ev.pointerId);
        resizingWidget = null;
        const w = workspaceStore.widgets.find((ww) => ww.id === widgetId);
        if (w) void workspaceStore.resizeWidget(widgetId, w.width, w.height);
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
    }

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
}
```

### Step 2: リサイズハンドル div の onmousedown → onpointerdown に変更

```svelte
<div
    class="absolute bottom-1 right-1 ..."
    aria-label="リサイズ"
    onpointerdown={(e) => handleResizeStart(e, widget.id)}
    ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
>
    <GripVertical class="h-3 w-3 text-white/70" />
</div>
```

`ondragstart` ブロックも追加して HTML5 DnD との完全切り離しを保証する。

### Step 3: 旧 document mouse event リスナー削除を確認

`document.addEventListener('mousemove', onMove)` と `document.addEventListener('mouseup', onUp)` が残っていないことを確認。

### Step 4: pnpm verify

## コミット規約

`fix(PH-20260422-015): Widget リサイズ修復（pointer events + setPointerCapture）`

## 受け入れ条件

- [ ] 編集モードでリサイズハンドルをドラッグすると、span が拡大・縮小する
- [ ] ドラッグ中はウィジェットがリアルタイムにリサイズされる（optimisticResize）
- [ ] マウスをハンドル外に移動してもリサイズが継続する（setPointerCapture）
- [ ] `pnpm verify` 通過

## 停止条件

- TypeScript が `PointerEvent` を認識しない（lib.dom.d.ts の型問題）→ 停止して報告
