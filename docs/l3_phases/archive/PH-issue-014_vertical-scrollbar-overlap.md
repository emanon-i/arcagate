---
id: PH-issue-014
title: 縦スクロールバーが widget content と被らない (scrollbar-gutter 慎重)
status: done
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-489 (rollback で revert) — batch-108 劣化要因 #5 候補
---

# Issue 14: 縦スクロールバー被り防止

## 元 user fb (検収項目 #18)

> 縦スクロールバーが widget の右端 content (お気に入り星 / 数字バッジ等) と被って読めない

## 引用元 doc

- `ux_standards §10` スクロール / `§9` truncate
- `desktop_ui_ux P1` 状態 / P11 装飾より対象

## Fact

旧 PH-489 で WidgetShell / LibrarySidebar / SettingsPanel **全部に** `scrollbar-gutter: stable` 適用 → 過剰反応で密度低下 (本 plan で慎重に scope 限定)。

## 横展開

| 領域                                                | 対応                                  |
| --------------------------------------------------- | ------------------------------------- |
| WidgetShell の overflow-y:auto inner container のみ | `scrollbar-gutter: stable` 適用       |
| WidgetShell root / header                           | 適用しない (旧 PH-489 過剰反応の修正) |
| LibrarySidebar / SettingsPanel                      | 既存 inner scroll container のみ      |

## Plan A: 「scroll-area 内側のみ stable、root には付けない」

旧 PH-489 と異なり scope を **scroll を持つ inner container 限定**。

## 棄却 B (root 全 stable): 旧失敗パターン、棄却

## E2E

各 widget で縦スクロール出る state → 右端 content (お気に入り星 / count chip) が scrollbar と被らない検証

## 規格 update

`ux_standards §10` 「scroll-area 内側のみ stable、root に適用しない」明記
