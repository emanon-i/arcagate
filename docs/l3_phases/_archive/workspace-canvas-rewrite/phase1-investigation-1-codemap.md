# §1 現状 zoom 関連 code 全体マップ

zoom が呼ばれる callsite を grep で網羅。Phase 1 で触る範囲 / Phase 2-3 に持ち越す範囲を切り分ける。

## 1.1 生産 code (4 file)

### A. `src/lib/state/config.svelte.ts` (L94-109)

責務: zoom value の永続化 store。

```ts
const ZOOM_STORAGE_KEY = 'widget-zoom';
const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 25;        // ← widget-zoom.svelte.ts と二重定義
const MAX_ZOOM = 200;
let widgetZoom = $state(loadNumber(ZOOM_STORAGE_KEY, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM));

function setWidgetZoom(zoom: number): void {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom / 5) * 5));
    if (widgetZoom === clamped) return;
    widgetZoom = clamped;
    saveNumber(ZOOM_STORAGE_KEY, clamped);
}
```

**バグ源**:

- `Math.round(zoom / 5) * 5` で 5 単位に強制 round → Fit が `setZoom(31)` 呼んでも実際は 30 になり、scroll 計算と乖離
- MIN_ZOOM / MAX_ZOOM が `widget-zoom.svelte.ts` と二重定義

### B. `src/lib/state/widget-zoom.svelte.ts` (全 148 行)

責務: zoom UI 操作 (wheel / Reset / Fit) と DOM scroll の orchestration。

主要関数:

| 関数                    | 行     | 仕様の問題                                                                                                                                 |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `handleWheel(e)`        | 36-52  | Ctrl+wheel で `configStore.setWidgetZoom(zoom ± 10)` → **anchor 補正なし** (viewport center も cursor も)                                  |
| `resetZoom()`           | 61-63  | `configStore.setWidgetZoom(100)` のみ → **scroll 不変**、user 体感「中心ずれ」                                                             |
| `setZoom(value)`        | 65-67  | clamp + `configStore.setWidgetZoom(clamped)` → **anchor 補正なし**                                                                         |
| `fitToContent(widgets)` | 81-135 | bbox 計算 → setZoom → queueMicrotask scrollTo。**stale 定数 INNER_PAD/PADDING_LEFT/TOP の名残**、`floor(ratio×100)` で 5 単位 round と乖離 |

`widgetW`/`widgetH` は `Math.round(BASE_W * zoom/100)` で derive (33-34 行)。これは grid render と一致。

### C. `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` (関連 L101-180, 280-340, 405-415, 490-520)

責務: zoom + scroll + canvas + grid 全体の orchestration。

- `useWidgetZoom(() => workspaceContainer)` を call (L58)
- `computeInitialScroll(el)` で workspace 切替時の初期 scroll を計算 (L118-142)。**Fit と spec が重複** (BB center / canvas center)
- Ctrl+0 / Ctrl+Shift+1 keydown handler (L278-295) → `zoom.resetZoom()` / `zoom.fitToContent(widgets)`
- canvasW/H derive で `zoom.widgetW` / `zoom.widgetH` を参照 (L405-410)
- CSS variable `--widget-w` / `--widget-h` を canvas-edit-mode div に出力 (L492)
- `data-zoom={configStore.widgetZoom}` E2E 用属性 (L493)
- WorkspaceWidgetGrid に props で `widgetW={zoom.widgetW}` 渡す (L519-520)

### D. `src/lib/components/settings/SettingsPanel.svelte` (L213-230)

責務: settings 画面で現在 zoom を read-only 表示 (slider 撤廃済)。

- `現在の拡大率: {configStore.widgetZoom}%` を表示するのみ
- write しない → Phase 1 で **触らなくてよい** が、二重 clamp 撤廃で 73% など 5 の倍数でない値が表示される可能性あり (要 user 確認)

## 1.2 E2E test (3 file)

| File                                         | 内容                                                                 | Phase 1 への影響                                      |
| -------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `tests/e2e/widget-zoom.spec.ts`              | `data-zoom` 属性 + localStorage 永続化、wheel 段階変化、clamp 50-200 | **MIN_ZOOM=50 期待 → 25 に変わる** ので test 修正必須 |
| `tests/e2e/canvas-pan-zoom.spec.ts`          | Ctrl+0 で zoom 100% / toolbar 4 button 存在                          | Reset 後 scroll 位置を assert していない → 補完したい |
| `tests/e2e/workspace-editing.spec.ts` (L484) | `data-zoom` を一箇所参照                                             | 影響軽微                                              |

## 1.3 unit test (vitest)

`src/lib/utils/widget-grid.test.ts` のみ存在。**zoom-math は test 無し**。Phase 1 で zoom-math.test.ts 追加 (stash@{0} に既に書いてある)。

## 1.4 Phase 1 で触る / 触らない範囲

| Layer                                             | 触る?                            | 理由                                    |
| ------------------------------------------------- | -------------------------------- | --------------------------------------- |
| `zoom-math.ts` (新規)                             | ✅ pure function 切り出し        | 数値検証可能にする                      |
| `widget-zoom.svelte.ts`                           | ✅ 全面書き直し                  | Reset / Fit / wheel anchor を業界標準に |
| `config.svelte.ts setWidgetZoom`                  | ✅ round/5 撤廃、二重 clamp 撤廃 | drift 解消                              |
| `WorkspaceLayout.svelte` (Fit / Reset 呼び出し)   | ❌ 不変 (interface 同じ)         | scope 限定                              |
| `WorkspaceLayout.svelte` (`computeInitialScroll`) | ⚠️ 要 user decision               | zoom-math.ts に統一 vs Phase 2 で解消   |
| `WorkspaceLayout.svelte` (canvas size / grid)     | ❌ 不変                          | Phase 2 で書き直し                      |
| `WorkspaceWidgetGrid.svelte`                      | ❌ 不変                          | DOM grid は Phase 2 で virtualize       |
| `SettingsPanel.svelte`                            | ❌ 不変                          | display only                            |
| Widget tile components                            | ❌ 不変                          | 関係なし                                |
