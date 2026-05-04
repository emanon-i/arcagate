# §3 verification + 退行 risk matrix

## 3.1 各 commit の verification

| Commit         | unit (vitest)                              | type (svelte-check) | lint (biome/dprint) | e2e                           | 実機 (CDP)                        | Codex       |
| -------------- | ------------------------------------------ | ------------------- | ------------------- | ----------------------------- | --------------------------------- | ----------- |
| C1 chore       | 既存 192 + WIP 新規 → 全 pass              | 0 errors            | clean               | 既存 pass                     | —                                 | —           |
| C2 math anchor | 全 pass (型のみ確認)                       | 0 errors            | clean               | —                             | —                                 | —           |
| C3 test 分割   | **新 test 全 pass** (cursor anchor 3 件等) | 0 errors            | clean               | —                             | —                                 | —           |
| C4 widget-zoom | 全 pass                                    | 0 errors            | clean               | 既存 pass                     | HMR で wheel cursor 動作確認      | —           |
| C5 config      | 全 pass                                    | 0 errors            | clean               | 既存 pass (1 行修正は C7)     | HMR で zoom 73% 表示確認          | —           |
| C6 layout      | 全 pass                                    | 0 errors            | clean               | 既存 pass                     | workspace 切替で BB center scroll | —           |
| C7 e2e         | 全 pass                                    | 0 errors            | clean               | **修正版 + 3 件追加 全 pass** | —                                 | —           |
| C8 docs        | —                                          | —                   | dprint pass         | —                             | —                                 | —           |
| 統合           | 全 pass                                    | 0 errors            | clean               | 全 pass                       | **5 シナリオ screenshot**         | review pass |

**注**: 各 commit を `pnpm verify` 全 pass で push して履歴清潔に保つ。途中 commit で red になったら直ちに修正 commit を積む (revert じゃなく fix forward)。

## 3.2 退行 risk × 検出方法 matrix (調査 §4 の 8 risk)

| #  | Risk                                      | 重要度 | 検出方法                                                | Phase 1 対処                    |
| -- | ----------------------------------------- | ------ | ------------------------------------------------------- | ------------------------------- |
| R1 | wheel zoom cursor anchor で scroll 副作用 | High   | C7 e2e 追加 C (cursor 下 widget 不変) + 実機 シナリオ E | spec doc に明記 (C8)            |
| R2 | 二重 clamp 撤廃で 5 倍数でない zoom 表示  | High   | C5 で `Math.round` 表示 (Q5) + 実機シナリオ で 73% 確認 | display 側も round で統一       |
| R3 | MIN_ZOOM 50→25 で e2e 破綻                | High   | C7 で e2e L121 修正                                     | 1 行修正                        |
| R4 | computeInitialScroll 重複                 | Medium | C6 で削除 + 実機 workspace 切替で BB center 起点確認    | C6 で統一済                     |
| R5 | requestAnimationFrame 不足                | Medium | 実機 5 シナリオで scroll が遅延 / ガタつかない確認      | 必要なら 2 段 rAF (現状は 1 段) |
| R6 | smooth → instant 体感変化                 | Medium | 実機シナリオで Fit / Reset の動作が「ぱっ」になる確認   | spec doc に明記 (C8)            |
| R7 | config clamp 撤廃で異常値書き込み         | Low    | C5 で clampZoom 経由 (Q2 で defense in depth)           | C5 で対処済                     |
| R8 | 循環 import                               | Low    | `pnpm svelte-check` で検出                              | 一方向 import なので発生しない  |

→ **8 risk すべて Phase 1 内で test/screenshot で検出 + 対処**。

## 3.3 unit test 詳細 (zoom-math.test.ts + zoom-math-anchor.test.ts)

`zoom-math.test.ts` (基本 / ~150 行):

- `clampZoom` 5 ケース
- `cellStrideX/Y` 100% / 50% / 33% / **73% (5 単位でない、Q5 確定で raw 必要)**
- `computeBoundingBox` empty / single / multi
- `computeOrigin` 整数 / 小数 BB

`zoom-math-anchor.test.ts` (anchor / integration / ~150 行):

- `computeZoomAnchorScroll` viewport center anchor 5 ケース (既存)
- **新規**: cursor anchor 左上 / 中央 / 右下 3 ケース
- **新規**: zoom 73% (5 単位でない) で stride 計算
- `computeFitZoom` 4 ケース + **新規**: BB が viewport より小さい時 (zoom 200% capped) 1 ケース
- `computeFitScroll` 3 ケース
- integration: Fit → Reset 連続 (1 シナリオ)

合計 ~25 ケース、coverage は zoom-math.ts 全関数 100%。

## 3.4 e2e test 詳細

### widget-zoom.spec.ts (修正のみ、3 tests 維持)

- L121 「50〜200」 → 「25〜200」

### canvas-pan-zoom.spec.ts (3 ケース追加、既存 3 件は維持)

**追加 A: Reset zoom 後 viewport center 維持**

```typescript
// 1. 初期 zoom 100、widget 1 個 (col 5, row 5) 配置
// 2. Ctrl+wheel で zoom 50% にする (5 ステップ down)
// 3. scroll を中央付近に pan
// 4. data-zoom = 50 確認
// 5. Ctrl+0 で Reset
// 6. data-zoom = 100 確認
// 7. **widget の clientRect が viewport の (clientWidth/2, clientHeight/2) 付近** (許容 ±50px)
```

**追加 B: Fit-to-content で全 widget が viewport 内**

```typescript
// 1. 5 widget 配置 (col 0-4, row 0-3 散り)
// 2. zoom 200% に上げる + scroll を端に pan
// 3. Ctrl+Shift+1 で Fit
// 4. 全 widget の clientRect が viewport 内 (top/bottom/left/right 全部 viewport 範囲内)
```

**追加 C: wheel zoom で cursor 下不変**

```typescript
// 1. widget 1 個 (col 3, row 3) 配置、zoom 100%
// 2. mouse を widget の center に置く
// 3. widget の boundingClientRect を記録 (rect_before)
// 4. Ctrl+wheel down (zoom 100→90)
// 5. widget の boundingClientRect 再取得 (rect_after)
// 6. **cursor の clientX/Y が widget rect_after にも含まれる** (anchor が cursor で動いた)
//    OR (rect_after.center - cursor) は (rect_before.center - cursor) と同じ世界点を表す
```

→ 3 ケースで Reset / Fit / Wheel cursor anchor を網羅。

## 3.5 実機 CDP 5 シナリオ (Codex 二次レビュー前に実行)

| # | 名前            | 操作                                      | 期待                             | 検証                                               |
| - | --------------- | ----------------------------------------- | -------------------------------- | -------------------------------------------------- |
| 1 | Reset 前/後     | zoom 50, scroll 中央 → Ctrl+0             | zoom=100, viewport center 不変   | screenshot before/after Read 比較                  |
| 2 | Fit (1 widget)  | zoom 200, pan 端 → Ctrl+Shift+1           | zoom 100% (BB 余裕), widget 中央 | screenshot                                         |
| 3 | Fit (10 widget) | zoom 100 → Ctrl+Shift+1                   | zoom 50-80 程度, 全 widget 表示  | screenshot                                         |
| 4 | Fit (大 BB)     | 50 widget 配置 → Ctrl+Shift+1             | zoom 25 (clamp), 全 widget 入る  | screenshot                                         |
| 5 | Wheel anchor    | cursor を widget A 上、Ctrl+wheel up 5 回 | A が cursor 下に居続ける         | before/after の widget A 中心 → cursor 距離が ±5px |

各シナリオで `/tmp/redo3-shots/phase1-Sxx-(before|after).png` に保存、Read で目視確認。

## 3.6 Codex 二次レビュー指示

C8 完了後、PR 作成前に:

```bash
/run-codex review src/lib/state/widget-zoom.svelte.ts src/lib/utils/zoom-math.ts src/lib/state/config.svelte.ts
```

Codex 視点で確認したい:

- `clampZoom` の round が half-to-even / half-up どちらか / 期待と一致するか
- `computeZoomAnchorScroll` の数値精度 (float drift がループで膨らまないか)
- `requestAnimationFrame` callback で element が umnount されているケースの guard
- import 循環 / 二重定義残存有無

**重要**: Codex「RELEASE-READY」判定は記録するだけで信用しない。最終 OK は user dev 検収のみ。

## 3.7 数値検証スクリプト (実装フェーズで使う)

`E:/tmp/eval-zoom-verify.js` を用意して dev で実行:

```js
(async () => {
  const ws = document.querySelector('.canvas-edit-mode');
  return {
    zoom: parseInt(ws.getAttribute('data-zoom'), 10),
    scrollLeft: ws.scrollLeft,
    scrollTop: ws.scrollTop,
    clientWidth: ws.clientWidth,
    clientHeight: ws.clientHeight,
    scrollWidth: ws.scrollWidth,
    scrollHeight: ws.scrollHeight,
  };
})()
```

シナリオ 1-5 の before/after で値を取って spec 数値と一致確認。
