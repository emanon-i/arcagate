# Phase 1 調査: zoom math 書き直し

**Status**: investigation only / Plan 化前
**Scope**: zoom math のみ書き直す。infinite plane 化 (Phase 2) と複数選択 (Phase 3) は触らない。
**Date**: 2026-05-04
**Related research**: 業界調査 4 agent 完了 → research summary は dispatch-log 参照

## 0. Phase 1 の確定仕様 (user 確定)

| 動作                                               | 仕様                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Reset zoom** (Ctrl+0 / toolbar button)           | viewport center を anchor、zoom のみ 100% に戻す                               |
| **Fit-to-content** (Ctrl+Shift+1 / toolbar button) | bbox 計算 → bbox 中央を viewport 中央へ、margin 込み                           |
| **Wheel zoom** (Ctrl+wheel)                        | mouse cursor を anchor                                                         |
| **Button zoom** (もし将来追加)                     | viewport center anchor                                                         |
| **二重 clamp 撤廃**                                | `widget-zoom.setZoom` と `configStore.setWidgetZoom` の round/5×5 drift を解消 |

**Phase 1 で触らない (Phase 2 以降)**:

- 配置の有限性（cell の負座標 / 上限なし化）→ Phase 2
- DOM grid → CSS transform stage + virtualization → Phase 2
- 複数 widget 選択・編集 → Phase 3

→ 次の章は分割 doc に：

- [§1 現状 code 全体マップ](./phase1-investigation-1-codemap.md) — zoom が呼ばれる callsite 一覧
- [§2 既存 WIP の進捗](./phase1-investigation-2-wip-status.md) — stash@{0} の差分内訳
- [§3 修正対象ファイル + 変更概要](./phase1-investigation-3-targets.md)
- [§4 影響範囲 + 退行 risk](./phase1-investigation-4-risks.md)
- [§5 テスト戦略](./phase1-investigation-5-tests.md)
- [§6 工数見積](./phase1-investigation-6-effort.md)

## 重要事項 (実装前に user 確認したい点)

1. **Wheel zoom anchor を cursor にすると現状 e2e test が壊れる**: `widget-zoom.spec.ts` は `data-zoom` 属性のみ assert で位置を見ていないが、cursor anchor で scroll が動く副作用は無検証。test 補完が必要。

2. **二重 clamp 撤廃は spec 関係なく必須** だが、`configStore.setWidgetZoom` の `round(zoom/5)*5` を撤廃すると、Settings Panel の現在 zoom 表示 `{configStore.widgetZoom}%` が non-5-multiple (例: 73%) を表示するようになる。user 体感で問題無いかは要確認。

3. **`computeInitialScroll`** (WorkspaceLayout.svelte L114-142) は別の経路で「BB center / canvas center」を計算しており、Fit と spec が二重定義状態。**Phase 1 で zoom-math.ts に統一**してこの重複を解消する案 (推奨) vs 重複は Phase 2 で解消する案 (Phase 1 を最小に保つ) どちらにするか要確認。

4. **`requestAnimationFrame` vs `queueMicrotask`** (Svelte 5 reactive flush 後の DOM reflow タイミング): WIP は rAF を採用済。確認のみ。

5. **smooth scroll の扱い**: 現状 Fit は `behavior: 'smooth'` (600ms timing race risk)。WIP は `instant` に統一。これは spec として user 確認したい。

## 結論サマリ

- **コード read 完了**。zoom callsite は 4 生産 file + 3 e2e test ファイルに集中、`zoom-math.ts` 純粋関数に切り出し可能。
- **stash@{0} の WIP は 95% 完成** (zoom-math.ts pure functions + tests + widget-zoom.svelte.ts 書き直し)。
- **退行 risk が高いのは Wheel zoom の cursor anchor 化** (現状 viewport center → cursor)、Phase 1 で取り入れるか先送りか要 user decision。

詳細は §1〜§6 を参照。Plan 化は user sign-off 後。
