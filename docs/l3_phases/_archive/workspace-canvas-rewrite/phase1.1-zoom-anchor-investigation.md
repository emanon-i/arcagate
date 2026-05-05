# Phase 1.1 zoom anchor regression — investigation

**Status**: investigation only / Plan / 実装は STOP
**Scope**: Reset / Wheel zoom anchor が「画面外」 と感じる user 退行の root cause 特定
**Date**: 2026-05-05
**Predecessor**: PR #282 (Phase 1) merge 後の user 検収で発覚

## 0. user 報告

- ✅ Workspace の **配置系操作** OK
- ❌ **拡大率リセット / Wheel zoom の anchor が画面外にある** ように感じる
- 「**表示画面の中央を起点にしてほしい**」と要望

## 1. 再現手順 + 測定数値 (CDP 経由 dev 実機)

シナリオ: zoom 81% で widget を viewport 中央付近に置いた状態で **Ctrl+0** (Reset)

| 測定値                          | Before | After                    | 期待 (user 体感)                          |
| ------------------------------- | ------ | ------------------------ | ----------------------------------------- |
| zoom                            | 81     | 100                      | 100                                       |
| scrollLeft                      | 1992.8 | 2530.4                   | 同じ widget が viewport 中央に居る scroll |
| scrollTop                       | 7840.8 | 9739.2                   | 同上                                      |
| widget centerX (viewport coord) | 949    | 1010 (Δ +60)             | 949 (= 不変)                              |
| widget centerY (viewport coord) | 266    | **31** (Δ **−234**)      | 266 (= 不変)                              |
| widget top (viewport coord)     | 148.6  | **−111.8** (off-screen!) | viewport 内                               |

**結論**: Reset 後、widget が **viewport の上に 234 px ジャンプ** して半分以上 off-screen に出る。これが user の「anchor 画面外」体感の正体。

## 2. 仮説検証

user 提示の 5 仮説を検証:

### (a) `e.clientX/Y - rect.left/top` が container-outer 座標 → ❌ 違う

`getBoundingClientRect()` は viewport coord (scroll 込みの絶対 viewport)、`rect.left` で引けば container-relative 内座標になる。math は正しい。

### (b) viewport center が padding/sidebar/header 抜きじゃない → ❌ 違う

`canvas-edit-mode` div は padding 0、sidebar / header は **その外**。`el.clientWidth/2` は scrollable 領域のど真ん中。

### (c) **Math.round cell stride と raw zoom ratio の不整合 (Codex M3)** → ✅ **これが正解**

実測:

- `ratio = newZoom / oldZoom = 100 / 81 = 1.2346`
- `strideY ratio = cellStrideY(100) / cellStrideY(81) = 151 / 125 = 1.208`
- **両者の差 = 1.27%**

`computeZoomAnchorScroll` の formula:

```
T1 = anchor − (anchor − T0) × ratio
```

これは **canvas 全体が `ratio` 倍に拡縮する** 前提。実際の rendering は:

- cell content は `Math.round(BASE × zoom/100)` で zoom 比例
- **gap (16px) は fixed、scaling されない**
- INNER_PAD (20px) も fixed

→ canvas 全体の拡縮率は `(cellW × zoom + gap × ?) / (cellW × oldZoom + gap × ?)` で **gap が割合変動** → raw zoom ratio から外れる。

cumulative drift:

- canvas Y at viewport center (旧) = `scrollTop + clientHeight/2 = 7841 + 253 = 8094 px`
- formula の予測 (新 canvas Y) = `8094 × 1.2346 = 9991`
- 実際 (cell-correct) = `INNER_PAD + (8094 − INNER_PAD)/strideY(81) × strideY(100)` = `20 + (8074/125) × 151 = 20 + 9758 = 9778`
- diff = `9991 − 9778 = 213 px`

→ **観測 234 px に近い** (差は cellY が分数だったり Math.round の刻み)。

### (d) clampAnchor で anchor が container 内にクランプ vs world center 違い → ❌ 補助要因にならず

clampAnchor は anchor 入力 (container-relative px) を [0, clientWidth/Height] に絞るだけ。world coordinate には触らない。

### (e) 初期 scroll の BB center 起点と Reset zoom 後の anchor が違う場所 → ❌ 違う

初期 scroll は `computeFitScroll` (BB origin → viewport visual center)。
Reset zoom は `computeZoomAnchorScroll` (viewport center を anchor)。
両者が指す world point は **異なる** が、それぞれの spec 通り。問題は (c) の formula が wrong canvas coord を返すこと。

## 3. root cause まとめ

**`computeZoomAnchorScroll` の `ratio = newZoom / oldZoom` は canvas が gap-free に scaling する前提。実際は gap=16 / INNER_PAD=20 が fixed なので raw ratio が外れる。** 結果 zoom 変化が大きい (例 81→100) ほど drift が累積し、anchor (viewport center / cursor) 下にあった world point が viewport 外へ飛ぶ。

これは **Codex review の M3** で指摘されていた issue が **user-visible regression として顕在化** したもの。Phase 1 で「Phase 2 で対処」と先送りした項目だが、実際には user 体感で「anchor 壊れた」レベルの致命的退行。

## 4. test 現状の盲点

`zoom-math-anchor.test.ts` の Reset zoom test は **scroll = 0 / 100 / 200 / 800 / 50 / 30** と低い scroll 値ばかり。canvas coord = scrollLeft + anchor が小さいので drift も小さく見える (1.27% × 小さい canvas = 数 px) → **test が pass しても user 体感では再現される**。

→ test 不足。**「scroll が大きいときに widget が viewport 外に飛ばないこと」 を assert する test が必要**。

## 5. 修正方針案

### Option A: cell-coordinate based ratio (推奨)

```ts
// 旧: ratio = newZoom / oldZoom (canvas 全体一律拡縮 前提)
// 新: anchor の canvas point を cell 座標で表現、新 zoom で cell→px 再変換
const cellAtAnchorX = (T0.x + ax - INNER_PAD) / cellStrideX(oldZoom);
const cellAtAnchorY = (T0.y + ay - INNER_PAD) / cellStrideY(oldZoom);
const newCanvasX = INNER_PAD + cellAtAnchorX * cellStrideX(newZoom);
const newCanvasY = INNER_PAD + cellAtAnchorY * cellStrideY(newZoom);
return { scrollLeft: max(0, newCanvasX - ax), scrollTop: max(0, newCanvasY - ay) };
```

**根拠**: cell stride は描画と一致 (Math.round(BASE × zoom) + gap)、INNER_PAD は scale されないので別扱い。**描画系と同じ単位で計算**するため drift がゼロ。

修正コスト: 中 (`computeZoomAnchorScroll` 内 6 行差し替え + tests の expected 値再計算 + 大きい scroll の test ケース追加)。

### Option B: gap も scale 対象にする (CSS 構造を変える)

DOM grid の `gap: 16px` を `gap: calc(var(--gap-base) * var(--zoom))` のような scaling gap に変更。すると raw ratio = stride ratio で一致する。

修正コスト: 大 (CSS / grid layout / WidgetWidgetGrid 全部触る、Phase 2 範疇)、Phase 1.1 では却下。

### Option C: Math.round 撤廃で widgetW を float 化

`widgetW = BASE_W * zoom / 100` (float)。cellStride も float。

問題: CSS pixel 値が float になる、sub-pixel rendering で widget border がぼやける可能性。Tauri webview2 で挙動不確定。Phase 2 候補だが Phase 1.1 では却下。

→ **Option A 推奨**。pure function 1 件の修正で root cause 解消。

## 6. 修正 + test 方針

1. `computeZoomAnchorScroll` を cell-coord based に rewrite
2. 既存 9 件 anchor test の expected 値を再計算 (cell-coord formula で出す)
3. **新規 test 追加**: 「大きい scroll (例 5000+) + 大きい zoom 変化 (例 25→100) で anchor 下の cell が ±2px 以内に止まる」
4. `clampAnchor` / `non-finite guard` は維持 (orthogonal)
5. dev 実機検証: Reset / Wheel zoom 後、widget 位置が ≤2px の drift で一定

## 7. user 通知 + decision option

| Option | 内容                                                             | 工数                                                    |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------- |
| **A1** | 即修正 PR (`fix/zoom-anchor-cell-coord-phase1.1`) で main へ反映 | ~2h (実装 + test 再計算 + 実機検証 + Codex review + PR) |
| **A2** | 修正 PR + 関連 issue 1 件 (rAF race / Codex H2) も同時 fix       | ~3h                                                     |
| **B**  | Phase 2 まで先送り (gap も scaling 案、CSS 大改修)               | 大 (Phase 2 全体に巻き込まれる)                         |

→ **A1 推奨** (最小スコープで regression 解消、別 issue は別 PR)。

## 8. 不明点 / 残懸念

- (中) Cell-coord formula で `cellStride` が `Math.round` を持つので、新 cellStride が真の `stride_new = round(BASE×newZoom/100) + gap` に正しく一致するか要確認 (test で実測)
- (低) `INNER_PAD` (20px) も layout 変動した時に追従するか → 現状 fixed、Phase 2 で `INNER_PAD * scale` を考えるか要 user decision
- (低) anchor が `INNER_PAD` 内 (= grid 左端の 20px 余白) にいた場合、cell coord が負になる → 現状 `Math.max(0, ...)` で clamp 済、安全

## 9. 次のステップ

user の Option decision (A1 / A2 / B) を待って Plan 化 + 実装。
