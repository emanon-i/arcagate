---
id: PH-issue-016
title: アイコン+文字列はみ出し禁止 (audit script error 化)
status: done
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-491 (audit script、rollback で revert)
---

# Issue 16: はみ出し audit (error 化)

## 元 user fb (検収項目 #20)

> アイコン名・文字列が widget からはみ出す

## 引用元 doc

- `ux_standards §9` truncate ルール / `desktop_ui_ux P11` / `P12`

## Fact

旧 PH-491 で `scripts/audit-text-overflow.sh` を warning 段階導入 → 旧 PH-501 で error 化 (両方 rollback で revert)。本 plan で **error 直接導入**。

## Plan A: 「audit script + 既存 violations 個別 fix + lefthook + CI 統合」

`scripts/audit-text-overflow.sh`: flex item で `flex-1` を持つ text node に `truncate` or `min-w-0` のいずれか必須、違反 = error

PH-issue-015 で抽出する `WidgetListRow.svelte` 共通化により多くの violation を構造的解消。

## 棄却 B (CSS 一括 truncate): 文脈差を judge 不能、過剰

## E2E スコープ外

audit script 機械検証で十分。

## 規格 update

`ux_standards §9` に audit script 規定 (旧 PH-491 / PH-501 規格、再追加)
