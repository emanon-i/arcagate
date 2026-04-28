---
id: PH-issue-010
title: Store reactive mini-audit — mutation 後 reload 漏れ箇所のみ局所 fix (旧 PH-479 教訓厳守)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-479 (全 store spread copy → render storm 過剰反応)、本 plan は対症療法スタイル
---

# Issue 10: Reactive store mini-audit (慎重)

## 元 user fb (検収項目 #13)

> 全 store の reactive 反映を audit、漏れがあれば直す
> ⚠️ **過去 PH-479 で `items.map(i => ({ ...i }))` を全 store に一斉適用 → keyed each 内 `$derived` 全件再評価 → render storm + UI gata-gata** が劣化主因 (2026-04-28 hard rollback の引き金)

## 引用元 guideline doc

| Doc                                                | Section                                                  | 採用判断への寄与                                |
| -------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| `docs/lessons.md`                                  | "PH-479 reactive audit (#184) — 全 item spread の副作用" | **本 plan の最重要 anti-pattern**、再発させない |
| `docs/desktop_ui_ux_agent_rules.md`                | P1 (状態は常に見える) / P12 (整合性)                     | 反映漏れは P1 違反、ただし全置換は P12 違反     |
| `docs/l0_ideas/arcagate-engineering-principles.md` | §6 SFDIPOT (Function: 設定 → 表示連動)                   | 「直った」= 反映確認、機械検証                  |

## Fact 確認 phase (慎重)

旧 PH-479 アンチパターン:

```ts
items = items.map((item) => (item.id === id ? { ...updated } : { ...item }));
// ↑ 全 item の reference が毎更新で変わる → 全 keyed each 子の $derived 再評価
```

これを **絶対やらない**。代わりに **反映漏れ箇所 1 件ずつ調査 → ピンポイント fix** する。

調査手順 (本 plan 着手時):

1. dev session で「mutation したのに UI 反映されない」具体例を user 起点で列挙 (1〜3 件想定)
2. 該当 store メソッドの `await mutation; reload()` 経路を grep
3. `loadXxx()` を呼び忘れていれば追加 (依存集約データの再取得)
4. **spread copy はしない**、変更対象 1 件のみ新 reference

## UX 本質 phase

- 反映漏れ = state 不一致、user は「保存できてない？」と誤認 (P1)
- 全置換 = render storm、user は「カクカクする」(過去劣化体感)
- → **mutation 1 件 = reload 1 件 + 影響 store の reload** が最小スコープ

## 横展開 phase

| 経路                                           | 必要な fix                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `toggleStar(id)` → items 更新 + tag count 反映 | `loadTagWithCounts()` 呼び出し追加 (PH-479 で旧入った helper、形を残す) |
| `updateItem(id, ...)`                          | items reload + 変更 item の card 再 render                              |
| `deleteItem(id)`                               | items + tag counts + library stats                                      |
| 他 store mutation                              | dev で発見したものだけ局所 fix                                          |

**禁止**: 全 store メソッドへの一括 `items.map(spread)` 適用、E2E spec 7 本一括追加 (旧 PH-479 と同型) → やらない。

## Plan: 採用案 A: 「具体例ベースの局所 fix、最大 5 件まで」

- dev で発見した反映漏れを 1 件ずつ:
  - 該当 mutation の直後に必要な reload 呼び出し
  - **対象 1 件のみ new reference** (例: `items = items.map((i) => (i.id === id ? updated : i))` 全 spread しない)
- 修正したら個別 E2E spec で機械検証 (1 件 1 spec、最大 5 spec)
- **5 件超えそうなら本 plan を中断、root cause を再検討 (一斉適用の誘惑を断つ)**

## 棄却案 B: 「全 store 一斉 audit + spread copy」(旧 PH-479 と同型)

- **明確に棄却**、`docs/lessons.md` の retrospective そのもの
- 過去 user fb で「劣化」判定済

## 棄却案 C: 「reactive 不要、reload で全部 IPC fetch」

- 過剰、network / IPC コスト ↑
- → 棄却

## 規格 update

`docs/lessons.md` 既存 retrospective を参照する形で `engineering-principles §6 SFDIPOT (Function)` に「反映 audit は具体例ベース、一斉適用禁止」を embed。

## 実装ステップ

1. dev session で反映漏れ実例を user fb から特定 (1〜5 件)
2. 該当 store メソッドのみ局所 fix
3. 個別 E2E spec
4. lessons / engineering-principles update

## 注意

本 plan は **着手時に dev での具体例が無ければ着手しない**。「予防的全 audit」は禁止。
