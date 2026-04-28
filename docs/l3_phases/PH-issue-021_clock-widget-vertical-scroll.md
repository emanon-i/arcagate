---
id: PH-issue-021
title: ClockWidget — 小サイズで縦/横スクロール出ない (container query で fluid sizing)
status: done
parent_l1: REQ-006_workspace-widgets
related: 旧 hotfix #187 + 旧 PH-506 (rollback で revert)
---

# Issue 21: ClockWidget スクロール緊急 fix

## 元 user fb (検収項目 #25)

> ClockWidget を 1×1 (一番小さい) サイズにすると縦/横スクロールバーが出てしまう

## 引用元 doc

- `ux_standards §10` スクロール禁止 / `§6-1` Widget
- `desktop_ui_ux P11` 装飾より対象

## Fact

`ClockWidget.svelte` Goal A: 時計表示 (HH:MM:SS) が 1×1 で widget container を超える。

## UX

- 1×1: HH:MM のみ、適度な font-size (text-xl)
- 2×2: HH:MM:SS + 「2026-04-28 (火)」(text-3xl)
- 4×4 以上: HH:MM:SS + 日付 + 曜日 + 月相 etc (text-5xl)

## Plan A: 「container query で fluid sizing + overflow-hidden」

```svelte
<div class="@container w-full h-full overflow-hidden flex items-center justify-center">
  <div class="@xs:text-2xl @sm:text-3xl @md:text-5xl text-xl tabular-nums">
    {time}
    {#if showSeconds}<span class="@xs:inline hidden">:{seconds}</span>{/if}
  </div>
</div>
```

PH-issue-004 (grid size 縮小) で base 240×135 になる場合、`@xs` breakpoint = 200px などに調整。

## 棄却 B (font-size fixed): user fb 違反

## E2E

ClockWidget を 1×1 / 2×2 / 4×4 で配置 → 各 size で scrollbar 出ない、文字が container 内に収まる

## 規格 update

`ux_standards §6-1` に「small size widget は container query で fluid sizing」追加
