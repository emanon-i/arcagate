---
id: PH-issue-015
title: WatchFolder Widget — 名前 + アイコン被り解消 (list-row layout 共通化)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-500 (rollback で revert)
---

# Issue 15: WatchFolder 名前+アイコン被り

## 元 user fb (検収項目 #19)

> WatchFolder で widget タイトルとアイコンが被って表示が壊れている

## 引用元 doc

- `ux_standards §6-1 Widget` ヘッダ仕様 / `§9` truncate
- `desktop_ui_ux P1` 状態 / P8 読み順 / P4 横展開

## Fact

`src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte` Goal A: 各 entry の row layout で flex shrink 不適切。

## UX

- icon (固定 16px、`shrink-0`) + name (`flex-1 truncate min-w-0`) + 補助 (`shrink-0`)
- 1×1 size で横スクロール無し、name は truncate

## 横展開 (P4 補足 3)

list-row パターンの widget 全部 audit:

- ExeFolderWatch / FileSearch / ClipboardHistory / Snippet / Item / Projects / Recent

→ 共通 `WidgetListRow.svelte` 抽出 (PH-issue-016 の audit script と相補)

## Plan A: 「行 layout 修正 + 共通 row component 抽出 + AppWindow icon (検収 #36 統合)」

`WidgetListRow.svelte` props: `icon, label, suffix?`、layout 上記 UX 通り。

icon を `Folder` → `AppWindow` (起動可能アプリの意味、検収 #36)

## 棄却 B (個別 fix): 横展開漏れリスク

## E2E

長 name の entry → truncate されて icon 被らない、count chip 右端維持

## 規格 update

`ux_standards §6-1` に「list-row 共通仕様: icon shrink-0 / name min-w-0 flex-1 truncate / suffix shrink-0」明記
