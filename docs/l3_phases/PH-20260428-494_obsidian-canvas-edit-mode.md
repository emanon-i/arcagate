---
id: PH-20260428-494
title: Widget 編集モード = Obsidian Canvas 風 大幅刷新 (pan + zoom + free layout)
status: todo
batch: 108
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte
  - src/lib/state/workspace-canvas.svelte.ts (new)
---

# PH-494: 編集モード Obsidian Canvas 風刷新

## 背景

ユーザー dev fb (2026-04-28):

> あとウィジットの編集時にもっと表示領域広げてくれもっっっとでかくていい
> ウィジット編集モードちゃんとObsidianのキャンバスをまねてくれ

参考: Obsidian Canvas — ドット格子背景、浮遊カード、左右ツールバー、右側 zoom +/- ボタン群、全体 scale transform (リサイズ不要、zoom = simple scale)。

## 入力マッピング (user 指定、必ず実装)

| 操作                        | 動作                                                                  |
| --------------------------- | --------------------------------------------------------------------- |
| マウススクロール            | 上下パン (vertical pan)                                               |
| Shift + マウススクロール    | 左右パン (horizontal pan)                                             |
| ミドルクリック + マウス移動 | 自由パン (button=1 hold + drag)                                       |
| Ctrl + スクロール           | 拡大縮小 (Ctrl+wheel)、UI 全体 scale transform、wheel target 位置基準 |

ズームは **単純スケール (scale transform)** で実現、レイアウト再計算なし。0.25x 〜 4x、default 1x。

## 受け入れ条件

- [ ] 編集モード canvas に **dotted grid 背景** 表示 (radial-gradient 16px or 24px、subtle)
- [ ] **vertical pan**: wheel (deltaY) で `translateY` 変化
- [ ] **horizontal pan**: shift+wheel (deltaY → translateX)
- [ ] **free pan**: middle button (button=1) hold で mouse move 中に translateX/Y
- [ ] **zoom**: ctrl+wheel で scale (0.25x to 4x、step 0.1)、wheel target 位置を中心に拡大 (mouse position 基準)
- [ ] **canvas 状態 persist**: workspace 単位で `editMode.canvasView = { x, y, scale }` を localStorage or DB に保存、再 open で復元
- [ ] **ズーム +/- ボタン**: 右側 toolbar に zoom-in / zoom-out / fit-to-screen / 100% reset
- [ ] **編集モード以外は通常 grid 表示** (canvas は edit only)
- [ ] **pan/zoom 範囲**: canvas size + padding で clamp、無限スクロール禁止
- [ ] **E2E**: wheel/shift+wheel/middle drag/ctrl+wheel で transform 値が期待通り変わることを assert
- [ ] minimap は **v1 では optional** (実装容易なら入れる、難しければ deferred)

### SFDIPOT

- F: 各入力で transform 変化、persist
- D: canvasView state を workspace store に追加 ({ x, y, scale })
- I: WorkspaceLayout の canvas wrapper に wheel/mousedown/mousemove/mouseup handler
- P: WebView2 で transform: scale + translate OK、container query との干渉なし
- T: pan/zoom < 16ms (60fps)
- O: middle drag 中はカーソルを grabbing、IME / input focus 中は skip

### 実装方針 (詳細)

```ts
// canvas wrapper
<div bind:this={canvasEl}
     onwheel={onWheel}
     onmousedown={onMouseDown}
     onmousemove={onMouseMove}
     onmouseup={onMouseUp}
     style="transform: scale({scale}) translate({x}px, {y}px); transform-origin: 0 0;">
  <WidgetGrid ... />
</div>

function onWheel(e: WheelEvent) {
  if (e.ctrlKey) {
    // zoom toward mouse
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(e.clientX, e.clientY, factor);
  } else if (e.shiftKey) {
    e.preventDefault();
    x -= e.deltaY;
  } else {
    e.preventDefault();
    y -= e.deltaY;
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button === 1) { // middle
    e.preventDefault();
    panStart = { mx: e.clientX, my: e.clientY, x, y };
    isPanning = true;
  }
}
function onMouseMove(e: MouseEvent) {
  if (isPanning) {
    x = panStart.x + (e.clientX - panStart.mx);
    y = panStart.y + (e.clientY - panStart.my);
  }
}
function onMouseUp() { isPanning = false; }

function zoomAt(cx: number, cy: number, factor: number) {
  const newScale = Math.max(0.25, Math.min(4, scale * factor));
  // 中心 (cx, cy) を保持: world point = (cx-x)/scale = (cx-newX)/newScale
  const newX = cx - (cx - x) * (newScale / scale);
  const newY = cy - (cy - y) * (newScale / scale);
  scale = newScale; x = newX; y = newY;
}
```

### 横展開チェック

- [ ] PH-472 widget handle は scale 内でも正常動作 (DOM そのままで scale)
- [ ] PH-473 grid lines 背景 + dotted grid 背景の共存 (Obsidian 風 dotted を優先、grid line は薄く)
- [ ] PH-477 Undo/Redo は canvasView 移動を含めない (widget 操作のみ)

## 実装ステップ

1. `workspace-canvas.svelte.ts` (new) で canvasView state + persist API
2. WorkspaceLayout.svelte の canvas wrapper に transform + handler
3. dotted grid 背景 CSS (radial-gradient)
4. 右側 toolbar (zoom +/- / fit / reset)
5. workspace 切替で canvasView 復元
6. E2E: wheel / shift+wheel / middle drag / ctrl+wheel test

## 規約参照

- HICCUPPS [Image] Obsidian Canvas を直訳
- engineering-principles §6 (Time: 60fps、F: 入力ごとに正確な transform)
- lessons.md「PointerEvent と page.mouse の競合」(E2E 注意)
