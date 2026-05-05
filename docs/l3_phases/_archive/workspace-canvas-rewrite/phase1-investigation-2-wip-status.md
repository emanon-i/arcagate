# §2 stash@{0} WIP 進捗

post-redo3-7-zoom-rewrite-WIP として 4 file を stash 済（git stash list で確認）。

## 2.1 stash 内容 (`git stash show --stat stash@{0}`)

| file                                  | 状態         | 行数    |
| ------------------------------------- | ------------ | ------- |
| `src/lib/utils/zoom-math.ts`          | **新規追加** | +166    |
| `src/lib/utils/zoom-math.test.ts`     | **新規追加** | +288    |
| `src/lib/state/widget-zoom.svelte.ts` | 全面書き直し | +92/−95 |
| `src/lib/state/config.svelte.ts`      | clamp 修正   | +12/−6  |

合計 +564 / −95 / 4 file。

## 2.2 zoom-math.ts (新規 pure function 群)

定数 export (zoom 関連を 1 箇所に集約):

- `BASE_W=240`, `BASE_H=135`, `GRID_GAP=16`, `INNER_PAD=20`
- `MIN_ZOOM=25`, `MAX_ZOOM=200`, `RESET_ZOOM=100`
- `TOP_RESERVE=80`, `BOTTOM_RESERVE=80`, `SIDE_RESERVE=40`

関数:

| 関数                                                  | spec                                                           | Phase 1 で必要?                  |
| ----------------------------------------------------- | -------------------------------------------------------------- | -------------------------------- |
| `clampZoom(zoom)`                                     | round + clamp [25, 200]                                        | ✅                               |
| `cellStrideX(zoom)` / `cellStrideY(zoom)`             | `round(BASE × zoom/100) + GRID_GAP` (grid render と一致)       | ✅                               |
| `computeBoundingBox(widgets)`                         | min/max → BB or null                                           | ✅                               |
| `computeOrigin(bb)`                                   | BB center を cell 単位で返す                                   | ✅                               |
| `computeZoomAnchorScroll(oldZoom, newZoom, viewport)` | **viewport center anchor formula** `T1 = Sm - (Sm-T0) × ratio` | ✅ Reset / Wheel zoom 双方で使う |
| `computeFitZoom(bb, viewport)`                        | min ratio (chrome reserve 込み) → floor → clamp                | ✅                               |
| `computeFitScroll(origin, zoom, viewport)`            | origin px → visual center (chrome 補正)                        | ✅                               |

**業界標準 formula (Excalidraw / tldraw / Figma / Miro 同型) を実装済**。

**注**: Phase 1 で wheel zoom の **mouse cursor anchor** 化を採用するなら、`computeZoomAnchorScroll` の anchor 引数を可変化する必要あり (現状は viewport center 固定)。要 user decision。

## 2.3 zoom-math.test.ts (新規 vitest)

288 行 / カバレッジ:

- `clampZoom`: 5 ケース (下限 / 上限 / round / integer / 範囲内)
- `cellStrideX/Y`: 100% / 50% / 33% で grid render と一致確認
- `computeBoundingBox`: empty / single / multi
- `computeOrigin`: 整数 / 小数 BB
- `computeZoomAnchorScroll`: 倍率増 / 半分 / 不変 / 負 → 0 clamp / oldZoom=0 graceful
- `computeFitZoom`: 完全 fit (>200 → clamp) / 巨大 BB (<25 → clamp) / floor 確認 / 縮退 BB
- `computeFitScroll`: origin 中央配置 / zoom 50 計算 / 負 → 0 clamp
- **integration test** (Fit → Reset の連続シナリオで数値確認)

→ 数値検証は **stash 復元すれば即 pass する想定**。HMR + 実機検証が最終確認。

## 2.4 widget-zoom.svelte.ts 書き直し済

stash 版の構造:

```ts
function applyZoom(el, oldZoom, newZoom) {
    const target = computeZoomAnchorScroll(oldZoom, newZoom, viewport);
    configStore.setWidgetZoom(newZoom);
    requestAnimationFrame(() => el.scrollTo({ ...target, behavior: 'instant' }));
}
function setZoom(v) { applyZoom(el, oldZoom, clampZoom(v)); }
function resetZoom() { setZoom(RESET_ZOOM); }
function handleWheel(e) {
    if (e.ctrlKey) applyZoom(el, oldZoom, clampZoom(oldZoom + delta));
}
function fitToContent(widgets) {
    const bb = computeBoundingBox(widgets);
    const origin = computeOrigin(bb);
    const targetZoom = computeFitZoom(bb, viewport);
    configStore.setWidgetZoom(targetZoom);
    requestAnimationFrame(() => {
        el.scrollTo(computeFitScroll(origin, targetZoom, viewport));
    });
}
```

すべて pure function を call するだけの薄い orchestration になっている。

**未対応 (Phase 1 残作業)**:

1. **Wheel zoom の cursor anchor**: 現在は viewport center 固定。`applyZoom` に anchor 引数を追加して wheel は cursor を渡す改修必要。
2. **smooth → instant** に統一済。これで OK か user 確認したい。
3. **MIN_ZOOM / MAX_ZOOM の二重定義** が config.svelte.ts と widget-zoom.svelte.ts に残る。zoom-math.ts に集約して config から import する案あり。

## 2.5 config.svelte.ts 修正済

```ts
function setWidgetZoom(zoom: number): void {
    const next = Math.round(zoom);    // 5 単位 round 撤廃
    if (widgetZoom === next) return;
    widgetZoom = next;
    saveNumber(ZOOM_STORAGE_KEY, next);
}
```

clamp は zoom-math.ts の `clampZoom()` が caller 側で担う前提 (二重 clamp 撤廃)。

**懸念**: Phase 1 後は `configStore.setWidgetZoom(500)` を呼ぶと clamp なしで 500 が保存される。caller が常に clampZoom 経由で呼ぶ規律が必要 → linter / 型で強制困難。

→ **alternative**: configStore 側に最低限の clamp を残す (round/5 だけ撤廃) のが安全かも。要 user decision。

## 2.6 stash 復元 vs 書き直しの判断

**stash 復元推奨** (理由):

- pure function の数値検証が既に済んでいる
- 業界標準 formula 採用済
- test 288 行が動く前提で書かれている
- **ただし** Phase 1 確定仕様 (wheel cursor anchor, MIN_ZOOM 集約) を満たすために**追加修正が必要**

実装フェーズに入ったら:

1. `git stash pop stash@{0}` で復元
2. `applyZoom(el, oldZoom, newZoom, anchorPoint)` 引数追加 (cursor anchor 用)
3. wheel handler で `applyZoom(..., { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop })` 渡す
4. MIN_ZOOM / MAX_ZOOM を zoom-math.ts に集約、config から import
5. e2e test の MIN_ZOOM=50 期待を 25 に修正
6. 実機検証
