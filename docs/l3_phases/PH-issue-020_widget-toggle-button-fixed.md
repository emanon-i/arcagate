---
id: PH-issue-020
title: ウィジット切替ボタン (編集モード) を左上固定 ⚠️ PH-issue-002 で消える可能性
status: archived-pending-002
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-496 (rollback で revert)
---

# Issue 20: ウィジット切替ボタン位置

## 元 user fb (検収項目 #24)

> 編集モードボタンが分かりにくい、目立つ位置に固定したい

## ⚠️ PH-issue-002 との関係

PH-issue-002 (Obsidian Canvas 完全実装) で **編集モード撤廃** 採用 → 「編集モードボタン」自体が消滅。

→ **本 plan は archived (PH-issue-002 着手後に再評価)**

## 着手前の再評価ポイント

PH-issue-002 main 反映後、Workspace UI の構成を再 audit:

- 編集モード概念消滅後、左上に必要な toggle が残るか?
  - Sidebar 表示切替? → Library 画面側にあれば不要
  - ヘルプ button? → header に既存
- 該当する操作が無ければ本 plan を delete (archived のまま)
- 残るなら新 plan で起票 (本 plan は記録としてのみ残す)

## 結論

PH-issue-002 完了まで **着手しない**。
