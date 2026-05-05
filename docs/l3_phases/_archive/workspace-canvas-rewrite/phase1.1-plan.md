# Phase 1.1 Plan: zoom anchor を cell-coord ratio で書き直し

**Status**: Plan / 実装着手 OK (user 承認済 = Option A1)
**Scope**: `computeZoomAnchorScroll` の ratio drift 修正のみ。Codex H2 (rAF race) / M3 別解 / L6 は別 PR。
**Date**: 2026-05-05
**Predecessor**: [phase1.1-zoom-anchor-investigation.md](./phase1.1-zoom-anchor-investigation.md)

## 0. 確定仕様 (調査 §5 Option A)

`computeZoomAnchorScroll` を cell-coord 経由の formula に書き直し:

```
// 旧 (raw zoom ratio): canvas 全体一律拡縮 前提 → gap fixed で drift 累積
T1 = anchor − (anchor − T0) × (newZoom / oldZoom)

// 新 (cell-coord based): 描画と同じ単位で計算 → drift ゼロ
cellAtAnchorX = (T0.x + ax − INNER_PAD) / cellStrideX(oldZoom)
cellAtAnchorY = (T0.y + ay − INNER_PAD) / cellStrideY(oldZoom)
newCanvasX = INNER_PAD + cellAtAnchorX × cellStrideX(newZoom)
newCanvasY = INNER_PAD + cellAtAnchorY × cellStrideY(newZoom)
T1 = max(0, newCanvasX − ax), max(0, newCanvasY − ay)
```

- `cellStrideX/Y` は描画 (`Math.round(BASE × zoom/100) + GRID_GAP`) と同じ → drift ゼロ保証
- `INNER_PAD` は scale されない fixed offset、別扱いで安全
- anchor が `INNER_PAD` 内 (= 左上余白) の場合 cell coord が負になるが、`max(0, ...)` clamp で安全
- `oldZoom <= 0` / non-finite guard は維持 (Codex M4)

## 1. 修正対象ファイル

| File                                     | 種別                                                     | 行数    |
| ---------------------------------------- | -------------------------------------------------------- | ------- |
| `src/lib/utils/zoom-math.ts`             | 関数 1 件書き直し                                        | -10 +20 |
| `src/lib/utils/zoom-math-anchor.test.ts` | 既存 test の expected 再計算 + 大 scroll drift test 追加 | -10 +60 |

**触らない**:

- `widget-zoom.svelte.ts` (interface 不変、cell-coord 化は内部実装変更のみ)
- `WorkspaceLayout.svelte` (computeFitScroll は H1 で別経路、影響なし)
- e2e tests (data-zoom 値で assert、cell-coord 化で値は変わらない)
- `config.svelte.ts` (zoom store 不変)

## 2. commit 構造 (2 commit、squash merge)

| #  | 種別            | 内容                                                                                    |
| -- | --------------- | --------------------------------------------------------------------------------------- |
| C1 | fix(zoom-math)  | `computeZoomAnchorScroll` を cell-coord based に書き直し + 既存 test の expected 再計算 |
| C2 | test(zoom-math) | 大 scroll (5000+) で drift がゼロに近いことを assert する test 追加 (3 ケース)          |

各 commit で `pnpm verify` 全 pass を確認、落ちたら次に進まない。

## 3. verification matrix

### unit (vitest)

- 既存 5 anchor test の expected 再計算 (raw ratio → cell-coord)
- 新規 3 test:
  - **drift-large-scroll**: `scrollTop=7841 + zoom 81→100` で 期待値と実測 Δ ≤ 2 px
  - **drift-extreme-zoom**: `zoom 25→200` で `Δ ≤ 2 px`
  - **drift-stride-rounding**: zoom 51 (cellW=round(122.4)=122 vs 51% raw=122.4) でも cell-coord 計算が一致

### 実機 CDP

| シナリオ                      | before                   | after fix      | 期待            |
| ----------------------------- | ------------------------ | -------------- | --------------- |
| Reset 81→100 (scroll 7841)    | widget jumps -234 px Y   | drift ≤ 2 px   | widget 位置維持 |
| Wheel 100→110 (cursor anchor) | (S3 で Δ 0.3 px、許容内) | 同等または改善 | drift ≤ 1 px    |
| Reset 25→100 (大 zoom)        | widget が大きく移動      | drift ≤ 2 px   | widget 位置維持 |

### Codex 二次レビュー

PR 作成前に `/run-codex review src/lib/utils/zoom-math.ts` で再 review。新 formula の数値精度 / edge case を確認。

### 退行検出

- 既存 e2e (`canvas-pan-zoom.spec.ts` の Reset / Fit / Wheel 3 ケース) 全 pass 維持
- vitest 229 → 232 に増 (3 件追加)
- cargo test 252 + 22 不変 (Rust 側 zoom 触らず)

## 4. user 検収シナリオ

PR merge 後、user に dev で実機検証依頼:

### A. zoom 81 で大 scroll → Reset (核心 regression)

1. workspace 開く、Ctrl+wheel で zoom 81% に下げる (`-100 deltaY × 2 回 = 80%、+1 回 = 90%` 等で 81 に近づける)
2. 適当な widget を見つけて、その widget が viewport center に来るよう pan
3. **Ctrl+0** (Reset)
4. **期待**: zoom 100% になり widget が **viewport center 付近** に維持される (旧: widget が画面外に飛ぶ)

### B. zoom 25 で大 zoom 変化 → Reset

1. zoom 25% まで下げる
2. widget を viewport center へ pan
3. **Ctrl+0**
4. **期待**: widget が viewport center 付近に維持 (Δ ≤ 数 px)

### C. Wheel zoom 連続 (cursor anchor)

1. mouse を widget の中心に置く
2. Ctrl+wheel up を 5-10 回連続
3. **期待**: widget が cursor 下に居続ける (drift = ほぼゼロ)

### D. Fit-to-content (Phase 1 通り、退行なし確認)

1. widget 散らし配置
2. **Ctrl+Shift+1**
3. **期待**: 全 widget が画面内 (Phase 1 で fix した動作維持)

### E. Settings 表示 (Phase 1 通り、退行なし確認)

1. zoom 73% 等 5 単位でない値
2. Settings → Workspace → 「現在の拡大率: 73%」
3. **期待**: raw 値表示 (Phase 1 通り)

## 5. 退行 risk + 緩和

| Risk                                            | 重要度 | 緩和                                                                         |
| ----------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| 既存 5 test の expected 再計算ミス              | High   | C1 で 1 件ずつ手計算検証 + コメントに計算式残す                              |
| cellStride の Math.round で stride が予想と違う | Medium | test で `cellStrideX(81)`, `cellStrideY(81)` を実測 export して assert       |
| INNER_PAD 周辺の anchor で cell coord が負      | Low    | `max(0, cellAtAnchorX)` 不要、計算後の scroll で `max(0)` clamp 既に入ってる |
| oldZoom = newZoom (no-op)                       | Low    | 既存の `if (oldZoom === newZoom) return` 等で短絡、cell-coord でも結果は同じ |
| extreme zoom 25 で cellW が round 偏差          | Low    | cellStrideX(25) = 76 で固定、test で実測 assert                              |

## 6. PR 戦略

- branch: `fix/zoom-anchor-cell-coord-phase1.1` (main から切る、Phase 1 PR #282 が main 反映後)
- title: `fix(zoom): Phase 1.1 — anchor を cell-coord ratio に書き直し (Phase 1 regression 解消)`
- body: 調査 §1-5 の数値 + 検収シナリオ A-E + Codex review 結果
- squash merge、`gh pr merge --auto --squash --delete-branch`

## 7. rollback

`git revert <PR-merge-commit-sha>` で 1 commit 戻し。Phase 1 (PR #282) の 旧 raw ratio 実装に戻る (= 元の regression 状態)。深刻な regression が出たら revert → user 検収 → 再着手 → Phase 1.1 v2。

## 8. 残課題 (Phase 1.1 範囲外、別 PR)

- Codex H2 (rapid zoom rAF race) → Phase 1.2 / 別 PR
- Codex L6 (Shift+wheel deltaMode) → Phase 2 / 別 PR
- I1 (EXE 監視 → 最近起動 記録漏れ) → 別 issue
- I2 (ItemWidget アイテム追加クラッシュ) → 別 issue
