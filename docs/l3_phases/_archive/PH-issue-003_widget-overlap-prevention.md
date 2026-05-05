---
id: PH-issue-003
title: Widget 同士の重なり回避 — 配置 / リサイズ / 移動全経路で重なり拒否
status: done
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

## 横展開 phase (2026-04-28 user 指摘で update)

⚠️ 旧実装で **「初回追加 = panel から click → `addWidget(type)` → findFreePosition fallback で (0,0) に配置 → 既存 widget と重なる」** バグあり。本 plan で **追加経路全部** で overlap check を強制する。

| 経路                                            | 現状                                                                             | 必要な fix                                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `addWidget(type)` (panel click 追加、座標なし)  | findFreePosition で空き探す → 見つからなければ **(0,0) fallback (overlap バグ)** | findFreePosition で空き発見可なら配置、**全マス埋まっていれば拒否 + toast「空きスペースがありません」** |
| `addWidgetAt(type, x, y)` (drag 追加、座標指定) | findFreePosition で別セル探す可能性 (auto-rearrange)                             | **指定セルが overlap なら拒否 + toast、別セルへ自動移動しない**                                         |
| `moveWidget(id, x, y)`                          | `isOverlapping` で拒否 + error 設定                                              | OK (既存維持)                                                                                           |
| `optimisticMoveAndResize` リサイズ              | `clampResizeForOverlap` で rubber-band                                           | OK (既存維持)                                                                                           |
| Sidebar D&D 配置                                | `addWidgetAt` 経由                                                               | 上記 fix で連動                                                                                         |

## Plan: 採用案 A: 「全追加経路で overlap reject + 共通 helper `wouldOverlapAt` 抽出」

**共通 helper 抽出**:

```ts
// src/lib/utils/widget-grid.ts
export function wouldOverlapAt(x: number, y: number, w: number, h: number, others: Rect[]): boolean {
  return others.some((o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);
}

export function findFreePosition(w: number, h: number, others: Rect[], maxCols: number, maxRow: number): { x: number; y: number } | null {
  for (let y = 0; y <= maxRow; y++) {
    for (let x = 0; x <= maxCols - w; x++) {
      if (!wouldOverlapAt(x, y, w, h, others)) return { x, y };
    }
  }
  return null;  // 全マス埋まり
}
```

**`addWidget(type)` 改修**:

- findFreePosition が **null を返したら** error 設定 + toast「空きスペースがありません」+ widget 追加せず早期 return
- (0,0) fallback の旧バグを排除

**`addWidgetAt(type, x, y)` 改修**:

- 指定セルで `wouldOverlapAt(x, y, w, h, others)` チェック
- overlap なら拒否 + toast「他のウィジェットと重なるため配置できません」
- 別セルへの auto-rearrange は **完全廃止**

**move/resize は既存維持** (`isOverlapping` / `clampResizeForOverlap`)

## 棄却案 B: 「重なる位置で auto-rearrange」

→ user fb 直接違反、予測不能 UX、棄却。

## 棄却案 C: 「(0,0) fallback を残す」

→ 旧バグそのもの、user 指摘の根本原因、棄却。

## E2E 複数シナリオ

`tests/e2e/widget-overlap-prevention.spec.ts`:

1. **「panel click 追加で空セルに自動配置」**:
   - widget A を (0,0) に既存 → panel click で widget 追加 → (1,0) など空セルに配置 (重ならない)
2. **「全マス埋まり時に追加拒否」**:
   - canvas 容量分の widget で埋める → 追加 click → toast「空きスペースがありません」+ widget 数変わらず
3. **「drag 追加で重なるセルを拒否」**:
   - widget A を (0,0) → sidebar から widget B を (0,0) へ drag drop → toast 表示 + B 配置されず
4. **「drag 追加で空セルへの drop は成功」**:
   - widget A を (0,0) → widget B を (2,0) へ drag drop → 配置成功

## 規格 update

`ux_standards §13` に下記を追加:

- **Widget 同士は重ならない** (常時不変条件)
- 追加経路 (panel click / drag drop) で overlap → 拒否 + toast、auto-rearrange / fallback 禁止
- move 経路で overlap → 拒否 + toast
- resize 経路で overlap → rubber-band (重ならない最大に丸める)

## 実装ステップ

1. `src/lib/utils/widget-grid.ts` に `wouldOverlapAt` + `findFreePosition` (null 返却版) 抽出 (既存ヘルパを統合)
2. `workspace.svelte.ts` `addWidget` 改修: findFreePosition null → toast + return
3. `workspace.svelte.ts` `addWidgetAt` 改修: wouldOverlapAt 検証 → overlap なら toast + return、別セル探さない
4. WorkspaceLayout の error 監視で toast 出す (既存 toastStore)
5. E2E spec 4 シナリオ
6. ux_standards §13 update
