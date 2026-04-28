---
id: PH-issue-004
title: グリッドセルサイズ縮小 — 表示密度 ↑、Workspace 上に widget が多く置けるよう
status: planning
parent_l1: REQ-006_workspace-widgets
---

# Issue 4: グリッドセルサイズ縮小

## 元 user fb (検収項目 #3)

> グリッドサイズ縮小 (現状 1 widget 1 セルが大きすぎ、画面に多くの widget を置けない)

## 引用元 guideline doc

| Doc                                        | Section                                                        | 採用判断への寄与                    |
| ------------------------------------------ | -------------------------------------------------------------- | ----------------------------------- |
| `docs/l1_requirements/ux_standards.md`     | §4-1 スペーシングスケール / §11 アイテムカードサイズプリセット | 4px グリッドベース / 既存サイズ感   |
| `docs/desktop_ui_ux_agent_rules.md`        | P9 画面密度はタスクに合わせて                                  | 一覧性が大事な Workspace では密度 ↑ |
| `docs/l1_requirements/ux_design_vision.md` | §2-5 情報密度とコントラスト                                    | 階層的視線誘導、密度 vs 余白        |

## Fact 確認 phase

`src/lib/state/widget-zoom.svelte.ts`:

```ts
const BASE_W = 320;  // 1 セル幅
const BASE_H = 180;  // 1 セル高さ (16:9 ratio)
```

zoom 100% で 320×180px。Workspace 1280×800 なら横 4 セル × 縦 4 セル (= 16 セル) しか置けない。

Obsidian Canvas は cell 概念がなく自由配置だが、Arcagate は grid 制約あり。

## UX 本質 phase

User 「多くの widget を置きたい」 =

1. 1 セルサイズを **小さく** (例: 240×135、または 16:10 で 240×150)
2. spanning (1 widget = 複数セル) は維持、小さい widget は 1×1 で済む
3. 既存 widget の **デフォルト span を再設定** (大きすぎる widget が画面占有しないよう)

ただし P9 の指摘:

- ClockWidget / SystemMonitor は 1×1 で OK
- ItemWidget (large card) は 2×2 want
- DailyTask / Snippet は 2×3 など可変

→ **base size 縮小 + デフォルト span 適切化** の 2 段。

## 横展開 phase

| 領域                               | 影響 / 対応                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `widget-zoom.svelte.ts BASE_W/H`   | 320→240、180→135 (16:9 維持)                                                                                        |
| 各 widget default 配置サイズ       | `workspace.svelte.ts addWidget` 内 default w/h、widget meta の `defaultSize` (要確認)                               |
| WidgetShell minH                   | 縮小サイズで content が破綻しないよう確認                                                                           |
| Library カード (4:3 ratio、別系統) | 影響なし、触らない                                                                                                  |
| 既存 widget の保存済 size          | DB の position は維持されるが width=1 が想定外に小さくなる → migration 不要 (cell 内容のみ変化、relative size 維持) |

## Plan: 採用案 A: 「BASE 240×135 + 各 widget default 再設定」

```diff
- const BASE_W = 320;
- const BASE_H = 180;
+ const BASE_W = 240;
+ const BASE_H = 135;
```

各 widget meta:

- Clock / SystemMonitor / Stats: 1×1 (default 維持)
- Item: 2×2 (大カード型)
- DailyTask / Snippet / QuickNote / ClipboardHistory: 2×2 or 2×3 (リスト系)
- ExeFolder / FileSearch / Projects: 2×2 (リスト系)

実機で各 widget の最小可動 size を測って妥当な default を決める (CSS overflow 監視)。

## 棄却案 B: 「user 設定で base size を変えられるようにする」

- 拡大率 slider が既にあり、それで代用可能 (user は zoom で調整)
- 設定数を増やすと選択コスト ↑ (P3 主要操作)
- → 棄却、固定値で改善

## 棄却案 C: 「base size はそのまま、各 widget の default span を 0.5×0.5 にできるよう grid を細分化」

- grid を細分化すると spanning ロジックが複雑化、overlap 検出も再実装
- ROI 低
- → 棄却

## E2E 1 シナリオ

- `tests/e2e/grid-cell-size.spec.ts`:
  - 1280×800 viewport で widget 6 つ追加 → 重ならず配置可能 (旧サイズだと 4 つで詰まる)
  - widget zoom 100% で BASE_W=240px となること

## 規格 update なし

`ux_standards §11` (アイテムカードサイズ) は Library 用、Workspace cell の規格は無いので本 plan で初規格化 (§13 に追記)。

## 実装ステップ

1. `widget-zoom.svelte.ts` BASE 値変更
2. 各 widget meta `defaultSize` 再設定 (既存値を実機で確認 + 最小可動 size 測定)
3. WidgetShell の min-height/width 確認
4. E2E spec
5. ux_standards §13 に「BASE_W=240px / BASE_H=135px / zoom 50-200%」明記
