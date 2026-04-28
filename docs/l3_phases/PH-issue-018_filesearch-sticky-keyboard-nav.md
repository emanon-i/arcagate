---
id: PH-issue-018
title: FileSearch — 検索バー sticky + ArrowUp/Down/Enter ナビ + IME 対応
status: done
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-493 (rollback で revert)
---

# Issue 18: FileSearch keyboard nav + sticky bar

## 元 user fb (検収項目 #22)

> FileSearch widget で検索バーが scroll で消える、結果リストを keyboard で選べない

## 引用元 doc

- `ux_standards §6-2` Palette (keyboard nav 標準)
- `desktop_ui_ux P10` 熟練者効率 / P6 a11y
- `lessons.md` IME 対応 (`e.isComposing`)

## UX

- 検索 input は widget content 上部 sticky (scroll しても残る)
- ArrowDown/Up で result 移動、Enter で起動
- IME 確定中 (`e.isComposing`) は ArrowUp/Down/Enter 無視
- selected row: `bg-surface-3 ring-1 ring-accent`

## Plan A: 「sticky bar + selectedIndex state + IME guard」

```ts
function handleKeydown(e: KeyboardEvent) {
  if (e.isComposing) return;
  if (e.key === 'ArrowDown') { selectedIndex = Math.min(selectedIndex + 1, results.length - 1); }
  else if (e.key === 'ArrowUp') { selectedIndex = Math.max(selectedIndex - 1, 0); }
  else if (e.key === 'Enter') { launchEntry(results[selectedIndex]); }
}
```

input `position: sticky; top: 0; bg-surface-1; z-index: 1`

## 棄却 B (sticky なし): user fb 違反

## E2E (1 @smoke)

検索入力 → ArrowDown 3 回 → Enter で 4 番目が起動

## 規格 update

`ux_standards §6-1` 「list 系 widget は検索 sticky + ArrowUp/Down/Enter + IME 対応」必須化
