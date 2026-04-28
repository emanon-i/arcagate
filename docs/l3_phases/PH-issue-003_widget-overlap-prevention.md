---
id: PH-issue-003
title: Widget 同士の重なり回避 — 配置 / リサイズ / 移動全経路で重なり拒否
status: planning
parent_l1: REQ-006_workspace-widgets
related: 既存 `clampResizeForOverlap` (リサイズ時のみ有効)、移動 / 追加経路は overlap 検出が部分的
---

# Issue 3: Widget 同士の重なり回避

## 元 user fb (検収項目 #2)

> Widget 同士は単純に重ならない (auto-rearrange 廃止、衝突したら配置拒否 or 押し戻し)。

## 引用元 guideline doc

| Doc                                                | Section                           | 採用判断への寄与                        |
| -------------------------------------------------- | --------------------------------- | --------------------------------------- |
| `docs/desktop_ui_ux_agent_rules.md`                | P1 (状態) / P2 (失敗前提)         | 重なりエラーを toast で明示、誤操作回復 |
| `docs/l1_requirements/ux_standards.md`             | §5 インタラクションフィードバック | 失敗時の明確なフィードバック            |
| `docs/l0_ideas/arcagate-engineering-principles.md` | §3 エラーハンドリング             | 「静かに失敗しない」                    |

## Fact 確認 phase

`src/lib/utils/resize-delta.ts` に `clampResizeForOverlap(start, proposed, others)` 関数が既にある。

`src/lib/state/workspace.svelte.ts`:

- `addWidget` / `addWidgetAt` / `moveWidget`: 配置時の overlap check が**不完全** (findFreePosition 経由で auto-rearrange する経路が残存している可能性)
- `commitMoveAndResize` / `optimisticMoveAndResize`: リサイズ時のみ clamp、move 経路は別

`isOverlapping(x, y, w, h, others)` ヘルパが workspace store にある (`moveWidget` 内で使用済)。

## UX 本質 phase

User 指示「単純に重ならない」=

1. **auto-rearrange は廃止** (予測不能、user の配置意図を破壊)
2. 重なる位置への配置試行は **拒否** + toast で「他のウィジェットと重なるため配置できません」(既存実装)
3. リサイズで他 widget を圧迫する場合は **rubber-band**: 重ならない最大に丸める (既存実装、`clampResizeForOverlap`)

→ 既存実装で半分完了、`addWidget` 経路の auto-rearrange を完全撤廃すれば完成。

## 横展開 phase

| 経路                               | 現状                                                   | 必要な fix                                |
| ---------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| `addWidgetAt(type, x, y)`          | findFreePosition で空き探す → 重なるなら別の場所に配置 | **指定セル に空きが無ければ拒否 + toast** |
| `addWidget(type)` (default 配置)   | 空き探す                                               | OK (default 配置は意図不明、空き探し許可) |
| `moveWidget(id, x, y)`             | `isOverlapping` で拒否 + error 設定                    | OK (既存)                                 |
| `optimisticMoveAndResize` リサイズ | `clampResizeForOverlap` で rubber-band                 | OK (既存)                                 |
| Sidebar からの D&D 配置            | `addWidgetAt` 経由                                     | 上記の fix で連動                         |

## Plan: 採用案 A: 「`addWidgetAt` で auto-rearrange 撤廃」

- `addWidgetAt(type, x, y)`: 指定セルの 1×1 領域に他 widget が重なれば **拒否** + toast「他のウィジェットと重なるため配置できません」(P1 状態 + P2 失敗前提)
- `addWidget(type)` (default 配置、引数なし): 既存の findFreePosition で空き探す維持 (user 意図不明な配置は妥当)
- E2E: `addWidgetAt` を重なる位置に呼んで toast が出る + widget が追加されないこと確認

## 棄却案 B: 「重なる位置だと auto-rearrange」

→ 予測不能 UX、user fb 直接違反。棄却。

## E2E 1 シナリオ

- `tests/e2e/workspace-widget-overlap.spec.ts`:
  - widget A (0,0) 1×1 既存 → addWidgetAt(0,0) → toast 表示 + widget 数変わらず

## 規格 update なし

`ux_standards §13` には記載なし、本 plan で初規格化 (「重なり拒否、auto-rearrange 廃止」を §13 に追記)。

## 実装ステップ

1. `addWidgetAt` で findFreePosition 呼び出しを削除、重なれば早期 return + error 設定
2. WorkspaceLayout の error 監視で toast 出す (既存 toastStore)
3. E2E spec 1 本
4. ux_standards §13 に「Widget 同士は重ならない、配置試行が重なれば拒否」追記
