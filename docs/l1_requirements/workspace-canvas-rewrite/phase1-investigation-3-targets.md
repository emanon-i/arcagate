# §3 修正対象ファイル + 変更概要

## 3.1 新規追加 (2 file)

### `src/lib/utils/zoom-math.ts` (~166 行 / 200 行制約内)

業界標準 zoom math の純粋関数を集約。Phase 1 で取り込む。

**stash 既存内容 + Phase 1 で追加すべき変更**:

- 既存 (stash 済): `clampZoom`, `cellStrideX/Y`, `computeBoundingBox`, `computeOrigin`, `computeZoomAnchorScroll`, `computeFitZoom`, `computeFitScroll`, 定数 export
- 追加: `computeZoomAnchorScroll` の **anchor 引数を `{x,y}` 可変化**（既定は viewport center、wheel 時は cursor）

```ts
// 例 (Phase 1 で追加)
export function computeZoomAnchorScroll(
    oldZoom: number,
    newZoom: number,
    viewport: Viewport,
    anchor?: { x: number; y: number },  // ← 追加。default は viewport center
): { scrollLeft: number; scrollTop: number };
```

### `src/lib/utils/zoom-math.test.ts` (~288 行 / 分割推奨)

200 行制約のため **2 file 分割**:

- `zoom-math.test.ts` ... 基本 / clamp / cellStride / BB / origin (~150 行)
- `zoom-math-anchor.test.ts` ... `computeZoomAnchorScroll` の anchor variants / Fit-Reset 連続 integration (~150 行)

## 3.2 全面書き直し (1 file)

### `src/lib/state/widget-zoom.svelte.ts` (~150 行 / 現状 148 行)

stash 版がベース。**Phase 1 で追加修正**:

1. `applyZoom(el, oldZoom, newZoom, anchor?)` 引数追加 → wheel handler で cursor 渡す
2. `MIN_ZOOM` / `MAX_ZOOM` / `RESET_ZOOM` を zoom-math.ts から import (現在は config と二重定義)
3. `e.clientX/Y` から viewport-relative 座標に変換するヘルパー (`anchorFromMouseEvent`)
4. test 補強用に `applyZoom` を return object に export (e2e から触れるように)

**触らない**: `widgetW` / `widgetH` derive は Math.round() で grid render と一致しているので不変。

## 3.3 部分修正 (1 file)

### `src/lib/state/config.svelte.ts` (L94-109、~16 行のみ修正)

```ts
// 変更前
import ...
const MIN_ZOOM = 25;
const MAX_ZOOM = 200;
const DEFAULT_ZOOM = 100;
let widgetZoom = $state(loadNumber(ZOOM_STORAGE_KEY, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM));
function setWidgetZoom(zoom) {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom / 5) * 5));
    ...
}

// 変更後
import { MIN_ZOOM, MAX_ZOOM, RESET_ZOOM, clampZoom } from '$lib/utils/zoom-math';
let widgetZoom = $state(loadNumber(ZOOM_STORAGE_KEY, RESET_ZOOM, MIN_ZOOM, MAX_ZOOM));
function setWidgetZoom(zoom) {
    const next = clampZoom(zoom);  // 二重 clamp じゃなく単一 source of truth
    ...
}
```

**選択 1**: 完全に caller 信頼 (clamp 無し) → defense なし、caller bug で異常値が永続化リスク
**選択 2**: `clampZoom()` を呼ぶ → defense in depth、Phase 1 推奨
**選択 3**: 旧 round/5 を残す → user 体感 "5 単位刻み" 維持、ただし Fit drift バグ残存 → 却下

→ **選択 2 推奨** (要 user 確認)。

## 3.4 不変 (Phase 1 で触らない)

| File                                                          | 理由                                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `WorkspaceLayout.svelte`                                      | zoom 関連 callsite は `useWidgetZoom` 経由のみ。interface 変わらない |
| `WorkspaceWidgetGrid.svelte`                                  | DOM grid は Phase 2 で virtualize。今は触らない                      |
| `WidgetHandles.svelte`                                        | resize 計算で widgetW/H 使うが zoom 経由で受け取るのみ、変更なし     |
| `SettingsPanel.svelte`                                        | display only、zoom write しない                                      |
| Widget tile components (各 `widgets/*/index.ts` / `*.svelte`) | 関係なし                                                             |

ただし WorkspaceLayout の `computeInitialScroll` が **Fit と spec 重複**している点は要注意。Phase 1 の最後で「Fit と一致させる」リファクタを入れるか、Phase 2 で持ち越すか要 user decision。

## 3.5 docs / spec 更新 (1 file)

### `docs/l1_requirements/ux_standards.md` (§13 Workspace Canvas、L355-720 範囲)

**変更箇所**:

- L356: "zoom 範囲 50〜200%" → "zoom 範囲 25〜200%" (PR #279 で既に変更済の可能性あり、要確認)
- L666-668: zoom shortcut 表 → Reset / Fit の anchor 仕様追記
- L709-711: Reset / Fit の動作仕様を「業界標準 (viewport center anchor / bbox center anchor)」と明記

200 行制約だが既存 file (>1000 行) なので Phase 1 の追記行は ~20 行以内。

## 3.6 修正対象ファイルまとめ

| File                                          | 種別       | 行数        | Phase 1 で確実?                             |
| --------------------------------------------- | ---------- | ----------- | ------------------------------------------- |
| `zoom-math.ts`                                | 新規       | ~170        | ✅ 確実                                     |
| `zoom-math.test.ts`                           | 新規       | ~150 (分割) | ✅ 確実                                     |
| `zoom-math-anchor.test.ts`                    | 新規       | ~150        | ✅ 確実                                     |
| `widget-zoom.svelte.ts`                       | 書き直し   | ~150        | ✅ 確実                                     |
| `config.svelte.ts`                            | 部分修正   | -10 +5      | ⚠️ caller 信頼 vs clamp 残す要 user decision |
| `tests/e2e/widget-zoom.spec.ts`               | 部分修正   | -3 +5       | ✅ MIN_ZOOM 50→25                           |
| `ux_standards.md`                             | spec 追記  | +20         | ✅ 確実                                     |
| `WorkspaceLayout.svelte computeInitialScroll` | リファクタ | -25 +10     | ⚠️ Phase 1 vs Phase 2 要 user decision       |

合計 ~7 file、+650 / -50 想定。

## 3.7 PR 戦略

- **1 PR で全部** (Phase 1 完結) を推奨。zoom-math 純粋関数 → caller 修正 → test → spec doc が論理的に 1 単位。
- 現状の `fix/item-widget-stability` branch は item-widget の方で push 済。Phase 1 用に新 branch `fix/zoom-rewrite-phase1` を main から切る。
