# §2 commit 単位の実装手順 (8 commit)

`fix/zoom-rewrite-phase1` branch を main から切ってから commit を順に積む。**全 8 commit は単一 PR で squash-merge する**前提なので個別 PR 化はしない。各 commit が論理単位で revert-able。

## C1: chore: stash@{0} pop + main conflict 解消

```bash
git checkout main && git pull origin main
git checkout -b fix/zoom-rewrite-phase1
git stash pop stash@{0}
# conflict 解消 (main は PR #281 まで取り込み済、stash 時点と差分発生してる可能性)
```

**触る file**:

- `src/lib/utils/zoom-math.ts` (stash 復活)
- `src/lib/utils/zoom-math.test.ts` (stash 復活)
- `src/lib/state/widget-zoom.svelte.ts` (stash 適用)
- `src/lib/state/config.svelte.ts` (stash 適用、PR #281 ItemSettings 系と衝突しないか確認)

**verify**: `pnpm verify` 全 pass を **必ず** 確認 (この commit が無傷で main 動作維持)。

**commit message**:

```
chore(zoom-phase1): stash@{0} pop で WIP 復元 + main conflict 解消

post-redo3-7-zoom-rewrite-WIP として stash していた zoom-math.ts /
zoom-math.test.ts / widget-zoom.svelte.ts / config.svelte.ts を main に
取り込み。本 commit 単独で pnpm verify 全 pass 確認。
以降の commit で cursor anchor 等の追加修正を積む。
```

---

## C2: feat(zoom-math): anchor 引数を可変化、cursor anchor 対応

**目的**: `computeZoomAnchorScroll` の anchor を可変にして wheel zoom が cursor を渡せるように。

**touch**:

- `src/lib/utils/zoom-math.ts`
  - `computeZoomAnchorScroll(oldZoom, newZoom, viewport, anchor?: {x, y})` 引数追加
  - `anchor` 未指定時は viewport center を使う
  - 関数 docstring に anchor 仕様を明記

**verify**: vitest **未実装**段階 (test は C3 で書く) なので `pnpm svelte-check && pnpm biome check src/lib/utils/zoom-math.ts` で型 + lint のみ。

---

## C3: test(zoom-math): test を 2 file 分割 + cursor anchor + 5-unit 撤廃 test

**目的**: 200 行制約遵守 + cursor anchor を含む新仕様の数値検証。

**touch**:

- `src/lib/utils/zoom-math.test.ts` ... 基本 / clamp / cellStride / BB / origin (~150 行)
- `src/lib/utils/zoom-math-anchor.test.ts` ... 新規分離 / `computeZoomAnchorScroll` cursor variants / Fit-Reset integration (~150 行)

**追加するテストケース (旧 stash 版から)**:

- cursor anchor 左上 (0, 0) で zoom 100→200 → scroll が `(0+0)*2 - W/2 = -W/2` → 0 clamp
- cursor anchor 中央 → viewport center anchor と完全一致
- cursor anchor 右下 (W, H) で zoom 100→50 → scroll 計算
- 73% (5 単位でない) zoom が cellStride で grid render と一致
- BB が viewport より小さい時の Fit (zoom 200% capped)

**verify**: `pnpm vitest run src/lib/utils/zoom-math` 全 pass。

---

## C4: refactor(widget-zoom): wheel cursor anchor + MIN_ZOOM 集約

**目的**: `widget-zoom.svelte.ts` を Phase 1 仕様に合わせる。

**touch**:

- `src/lib/state/widget-zoom.svelte.ts`
  - `MIN_ZOOM` / `MAX_ZOOM` / `RESET_ZOOM` を zoom-math.ts から import (二重定義撤廃)
  - `applyZoom(el, oldZoom, newZoom, anchor?)` 引数追加
  - `handleWheel(e)` で cursor anchor を渡す:
    ```ts
    const rect = el.getBoundingClientRect();
    const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    applyZoom(el, oldZoom, newZoom, anchor);
    ```
  - `setZoom(value)` / `resetZoom()` は anchor 引数を渡さない (default = viewport center)
  - `fitToContent` は anchor 経由しない (origin 直接配置で computeFitScroll 使う)

**verify**:

- `pnpm svelte-check` 0 errors
- `pnpm biome check src/lib/state/widget-zoom.svelte.ts` clean
- `pnpm vitest run` 既存 test 全 pass (interface 変更なし、副作用無いはず)

---

## C5: refactor(config): clampZoom 経由で defense in depth

**目的**: Q2 確定の clamp 残し方針を反映。

**touch**:

- `src/lib/state/config.svelte.ts` L94-109
  - `import { MIN_ZOOM, MAX_ZOOM, RESET_ZOOM, clampZoom } from '$lib/utils/zoom-math'`
  - `let widgetZoom = $state(loadNumber(ZOOM_STORAGE_KEY, RESET_ZOOM, MIN_ZOOM, MAX_ZOOM));`
  - `function setWidgetZoom(zoom: number) { const next = clampZoom(zoom); ... }`
  - 旧 `Math.round(zoom / 5) * 5` 完全撤廃

**verify**: `pnpm verify` 全 pass。e2e の widget-zoom.spec.ts は `data-zoom` attribute 値を見るだけだが、step ±10 の挙動は不変なので **既存 e2e は pass する想定** (clamp が 50→25 に変わる L121 のみ修正必要、これは C7 で)。

---

## C6: refactor(workspace-layout): computeInitialScroll を computeFitScroll で統一 (Q3)

**目的**: WorkspaceLayout の重複計算を撤廃。

**touch**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` L114-142
  - `computeInitialScroll(el)` 関数を撤廃
  - 代わりに workspace 切替 effect で:
    ```ts
    const widgets = workspaceStore.widgets;
    const bb = computeBoundingBox(widgets);
    if (bb) {
        const origin = computeOrigin(bb);
        const target = computeFitScroll(origin, configStore.widgetZoom, viewport);
        scrollTo(target);
    } else {
        scrollTo({ left: (scrollWidth - clientWidth) / 2, top: (scrollHeight - clientHeight) / 2 });
    }
    ```
  - import 文に zoom-math の `computeBoundingBox` / `computeOrigin` / `computeFitScroll` 追加

**verify**: HMR で実機確認 (workspace 切替で widget BB center 起点表示)、`pnpm verify` 全 pass。

---

## C7: test(e2e): MIN_ZOOM 50→25 修正 + Reset/Fit/Wheel anchor 3 ケース追加

**目的**: e2e で Phase 1 仕様の動作保証。

**touch**:

- `tests/e2e/widget-zoom.spec.ts`
  - L121 「ズーム範囲が 50〜200 にクランプ」 → 「25〜200」 (1 行修正)
- `tests/e2e/canvas-pan-zoom.spec.ts`
  - **追加 A**: Reset zoom 後、widget の clientRect が viewport center 付近に居る
  - **追加 B**: Fit-to-content 後、全 widget の clientRect が viewport 内
  - **追加 C**: wheel zoom (cursor anchor) で cursor 下の widget が同じ pixel 位置に留まる

**verify**: `pnpm test:e2e -g "ウィジェットズーム|Workspace Canvas"` で対象 spec 群 pass。

---

## C8: docs(spec): ux_standards.md §13 zoom 仕様追記

**目的**: spec doc を Phase 1 確定仕様で更新。

**touch**:

- `docs/l1_requirements/ux_standards.md`
  - L356: zoom 範囲 "50〜200%" → "25〜200%" (PR #279 で更新済か確認)
  - L666-668: zoom shortcut 表に anchor 仕様を追記
    - `Ctrl + wheel` → cursor anchor
    - `Ctrl + 0` → viewport center anchor
    - `Ctrl + Shift + 1` → BB center → viewport visual center
  - L709-711: Reset / Fit の動作に「業界標準 (Excalidraw / Figma / tldraw / Miro / Obsidian) 準拠」を追記

**verify**: 文章のみなので lint の document warnings 程度。dprint format pass。

---

## 実装順序の根拠

C1→C2→C3 は math 層を pure に整える (test 通る state を作る)。
C4→C5 は caller を新 math に乗せ替え (test を回しながら段階的に)。
C6 は重複削除 (この時点で全機能 zoom-math 統合)。
C7 は e2e で動作保証。
C8 は spec 文書化で Phase 1 完了。

**各 commit が独立して `pnpm verify` 全 pass する** ように分割している (revert しても build 通る前提)。

## 想定 size

- C1: +564 / -95 (stash 復元の volume が大きい)
- C2: +20 / -5
- C3: +60 / -50 (test 分割)
- C4: +30 / -30
- C5: +5 / -5
- C6: -25 / +10
- C7: +60 / -3
- C8: +25 / -3

合計 +800 前後 / -200 前後 / 7-8 file。**1 PR にまとめる** (Phase 1 全体が論理単位)。
