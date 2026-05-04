# §1 Phase 1 最終仕様 (Q1-Q5 確定後)

## 1.1 動作仕様 (9 項目)

### S1: Wheel zoom (Ctrl + Wheel)

- **anchor**: mouse cursor (`e.clientX/Y` を viewport 内座標に変換)
- **step**: ±10 / wheel tick (現状維持)
- **clamp**: [25, 200] (zoom-math.clampZoom)
- **scroll 補正**: cursor 下の世界点が cursor 下に居続ける `T1 = Sm − (Sm − T0) × ratio`
- **動作 timing**: `requestAnimationFrame` 待ち後 `scrollTo({ behavior: 'instant' })`

### S2: Reset zoom (Ctrl+0 / toolbar button)

- **anchor**: viewport center (`{x: clientWidth/2, y: clientHeight/2}`)
- **target zoom**: 100%
- **scroll 補正**: viewport center の世界点が viewport center に居続ける
- **動作**: `applyZoom(el, oldZoom, 100, viewportCenter)` の単純呼び出し

### S3: Fit-to-content (Ctrl+Shift+1 / toolbar button)

- **bbox 計算**: 全 widget の (minX, minY, maxX, maxY) → cell 単位
- **margin**: chrome reserve (TOP=80, BOTTOM=80, SIDE=40)
- **target zoom**: `floor(min(availW/bbW100, availH/bbH100) × 100)` を [25, 200] でクランプ
- **target scroll**: BB center 座標 (px) が viewport visual center に来る位置
- **空 workspace**: zoom 100% + canvas center scroll
- **動作**: `setWidgetZoom(targetZoom)` → `requestAnimationFrame` 待ち → `scrollTo({ instant })`

### S4: Button zoom (将来追加されたら)

- **anchor**: viewport center (Reset と同じ pattern)
- **現状 Phase 1 では未実装** (toolbar に zoom +/− button がない)

### S5: Initial scroll (workspace 切替時)

- **per-workspace 1 度だけ** 適用 (`lastInitializedWorkspaceId` guard、現状維持)
- **saved 位置がある**: localStorage から復元
- **saved 無し + widget 有り**: `computeFitScroll(origin, currentZoom, viewport)` で BB center scroll
- **saved 無し + widget 無し**: canvas center (現状の `computeInitialScroll` 空 path 動作維持)
- **Q3 確定により**: WorkspaceLayout の `computeInitialScroll` を撤廃、zoom-math.ts の関数で統一

### S6: 永続化

- **zoom**: localStorage `widget-zoom` (現状維持)
- **scroll**: localStorage `arcagate.workspace.pan.{wsId}` per-workspace (現状維持)
- **別 user 環境への影響**: なし (両方 localStorage)

### S7: clamp 規律 (Q2 確定)

- **`clampZoom(zoom)`**: zoom-math.ts の **唯一の clamp 関数**
- **`configStore.setWidgetZoom`**: 内部で `clampZoom()` を呼ぶ (defense in depth)
- **`widget-zoom.setZoom`**: caller として `clampZoom()` 経由で渡す (defense in depth)
- → caller / store 両方で clamp、二重 clamp ではあるが drift しない (5 単位 round 撤廃済)

### S8: Settings 表示 (Q5 確定)

- `現在の拡大率: {Math.round(configStore.widgetZoom)}%` で raw integer 表示 (73% も表示される)
- 旧: `{configStore.widgetZoom}%` だが内部で round/5×5 で 75 になる drift あり
- 新: round/5 撤廃で raw のまま表示 (Math.round は念のため float 防御)

### S9: smooth scroll 撤廃 (Q4 確定)

- Fit / Reset / Wheel zoom の scrollTo は全て `behavior: 'instant'`
- 旧 Fit の `behavior: 'smooth'` は 600ms timing race risk あり、撤廃
- 動画的演出が必要なら CSS transition で代替 (Phase 4 任意)

## 1.2 数値定数 (zoom-math.ts に集約)

```ts
export const BASE_W = 240;          // cell 幅 (zoom 100% 時)
export const BASE_H = 135;          // cell 高さ
export const GRID_GAP = 16;         // cell 間隔
export const INNER_PAD = 20;        // flex p-5 (canvas 内余白)
export const MIN_ZOOM = 25;         // PR #279 で 50→25
export const MAX_ZOOM = 200;
export const RESET_ZOOM = 100;
export const TOP_RESERVE = 80;      // PageTabBar 高さ + 余白
export const BOTTOM_RESERVE = 80;   // 右下 toolbar 高さ + 余白
export const SIDE_RESERVE = 40;     // 左右余白
```

`config.svelte.ts` と `widget-zoom.svelte.ts` の二重定義を撤廃、zoom-math.ts から import 統一。

## 1.3 state model (Phase 1 後)

```
configStore.widgetZoom : number (25-200, integer)        ← localStorage 永続化
                              │
                              ↓ 反応
useWidgetZoom.widgetW  : Math.round(BASE_W × zoom/100)   ← Svelte $derived
useWidgetZoom.widgetH  : Math.round(BASE_H × zoom/100)
                              │
                              ↓ Props
WorkspaceWidgetGrid.widgetW/H                            ← grid render に反映

workspaceContainer.scrollLeft/Top : DOM 直接                ← user pan + Reset/Fit/wheel が更新
                              │
                              ↓ debounce 200ms
localStorage[arcagate.workspace.pan.{wsId}]
```

scroll 値は **DOM 状態** で直接管理 (Svelte state にしない、現状維持)。zoom 変化時に `applyZoom` が DOM scrollTo で更新する。

## 1.4 Phase 1 で**変えない**仕様

| 項目                                   | 現状                                                        | Phase 1                      |
| -------------------------------------- | ----------------------------------------------------------- | ---------------------------- |
| canvas size 計算                       | `max(viewport, grid + 40)`                                  | 維持                         |
| dynamicCols / maxRow                   | `max(MIN_PAN_COLS=24, viewport-fit, BB)` / `max(128, BB+4)` | 維持                         |
| widget 配置 algorithm                  | findFreePosition / findFreePositionNear                     | 維持                         |
| DOM grid (224 cells × 24 cols)         | render                                                      | 維持 (Phase 2 で virtualize) |
| pan (middle drag / Space+drag / wheel) | DOM scroll 直接                                             | 維持                         |
| Shift+wheel 横 scroll                  | 維持                                                        | 維持                         |

## 1.5 Phase 1 後の動作の例

**前提**: viewport 1920×1080, canvas (zoom 100% で 6184×19368)

**シナリオ A**: 初期状態 zoom=100, scroll=(2000, 5000) で widget 1 個配置 → Reset 押す

- 旧: zoom=100 維持、scroll 不変 → user 体感「何も起きない」
- 新: zoom=100 (変更なし → no-op、`if (oldZoom === newZoom) return`)、scroll 不変 → 旧と同じ (期待挙動)

**シナリオ B**: zoom=25 で scroll=(800, 1500) → Reset 押す

- 旧: zoom=100、scroll 不変 → widget が viewport 外に飛ぶ
- 新: zoom=100、viewport center anchor で scroll = `(800+960)*4 - 960 = 6080` / `(1500+540)*4 - 540 = 7620` → viewport 中央に元の世界点が居る

**シナリオ C**: zoom=200, cursor (300, 200) で wheel down (zoom 200→190)

- 旧: zoom=190、scroll 不変 → cursor 下の世界点がずれる
- 新: zoom=190、cursor anchor で scroll 補正 → cursor 下の世界点が cursor 下に居続ける

**シナリオ D**: 10 widget 配置で Fit

- 旧: BB 計算 → setZoom (5 単位 round で 30→ 実際 30) → scroll 計算 (zoom 30 想定だが実際 30 でもズレ込み floor) → わずかに viewport center からズレる
- 新: BB 計算 → setZoom (raw 31) → scroll 計算 (zoom 31 で正確) → viewport visual center にぴったり BB center

**シナリオ E**: 50 widget で Fit (BB > viewport×4)

- 旧: zoom 25 (clamp) で計算 → scroll 補正 → BB center は viewport 内だが BB 端は外
- 新: 同じ (clamp 動作で全 widget 入らないのは同じ) → 視認性のための warning toast を出すか? → Phase 1 では出さない (現状維持)

→ 体感差が大きいのは A / B / C (Reset / Wheel zoom anchor)。D は微小、E は変化なし。
