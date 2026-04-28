---
id: PH-issue-017
title: WatchFolder unset / path 変更で旧 entries 即時 clear (race condition fix)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-490 + PH-492 (rollback で revert)
---

# Issue 17: WatchFolder path 変更で entries reset

## 元 user fb (検収項目 #21)

> WatchFolder の watch_path を変更/unset した時に、旧 path の entries が画面に残ったまま

## 引用元 doc

- `desktop_ui_ux P1` 状態 / `engineering-principles §3` 静かに失敗しない

## Fact

`ExeFolderWatchWidget.svelte` の `$effect` で `config.watch_path` 変更時に scan するが、旧 entries が残る race condition。

## UX

- path 変更 → 即時 entries clear → loading state → 新 entries
- unset → 即時 entries clear → 未設定 empty state (PH-issue-022 の WidgetEmptyState)

## 横展開

ExeFolderWatch + FileSearch 同パターン両方 audit

## Plan A: 「effect 開始時に entries 即時 clear + request id で stale response 破棄」

```ts
let scanRequestId = 0;
$effect(() => {
  const path = config.watch_path;
  entries = [];
  if (!path) return;
  const myId = ++scanRequestId;
  invoke('cmd_scan_exe_folders', { root: path }).then((result) => {
    if (myId !== scanRequestId) return;
    entries = result;
  });
});
```

## 棄却 B (loading 中も旧 entries 表示): user fb 直接違反

## E2E

path A → entries 表示 → path B 変更 → 旧 entries 即時 clear → B の entries 表示

## 規格 update

`ux_standards §6-1` に「config 変更時は派生 state 即時 clear、stale response 破棄」明記
