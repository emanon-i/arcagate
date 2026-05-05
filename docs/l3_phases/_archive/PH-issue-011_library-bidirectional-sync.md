---
id: PH-issue-011
title: Library 双方向同期 — item 削除 cascade (PH-issue-006 で吸収済)
status: superseded-by-006
parent_l1: REQ-006_workspace-widgets
related: PH-issue-006 (Widget collection + cascade、本 plan の要件は完全包含)
---

> **superseded-by-006** (2026-04-28): PH-issue-006 PR #233 で Rust 側 `cascade_remove_item_from_widgets` を実装、`cmd_delete_item` 内で全 widget config から該当 ID を自動除去。本 plan の要件 (Library item 削除 → widget 参照自動消去) は完全に達成。
>
> 残課題 (Library 編集 → widget 反映 / item rename / icon 変更) は reactive store の話なので PH-issue-010 (mini-audit) で扱う。

# Issue 11: Library 双方向同期

## 元 user fb (検収項目 #14)

> Library での item 削除 → 各 widget の参照も自動消える (双方向同期)

## 引用元 doc

- `engineering-principles §3` データ整合性 / `desktop_ui_ux P2` 失敗前提

## Fact

PH-issue-006 で widget config 内 `item_ids[]` の cascade を Rust 側 `cmd_delete_item` で実装する想定。
本 issue は **PH-issue-006 と完全重複** → 統合する。

## UX

User は同じ要件を 2 箇所で挙げているだけ。同期方向 = item delete → widget config から除去。

## 結論: PH-issue-006 に統合、本 plan は archive

実装する PR は PH-issue-006 で 1 本にまとめる。
本 plan は文書化のみ、実装は PH-issue-006 経由。

## 棄却

「Library 編集 → widget 反映 (item rename / icon 変更)」も検討対象だが、これは reactive store の話 → PH-issue-010 (mini-audit) で扱う。

## 実装ステップ: なし (PH-issue-006 で吸収)
