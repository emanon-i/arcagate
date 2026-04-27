---
id: PH-20260429-499
title: Per-widget polish — ClockWidget (batch-109 Phase B)
status: todo
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/clock/ClockWidget.svelte
  - src/lib/widgets/clock/ClockSettings.svelte
---

# PH-499: Per-widget polish — ClockWidget

## 背景

ユーザー dev fb (2026-04-28):

> ウィジェット一つ一つをUX方針に基づいて洗練されたものにしてほしい

batch-108 PH-498 (hotfix) で responsive 化済、本 plan で **製品レベル polish**。

## 共通品質 checklist

- [ ] 主要操作 (時刻表示) / sub 操作 (設定) / 状態 (12-24h、show_seconds、show_date、show_weekday) が明確に再定義
- [ ] **S/M/L サイズで適切に responsive**:
  - L: 大きな time + 日付 + 曜日 + (秒)
  - M: time + 日付 + 曜日
  - S: time のみ (date hide、PH-498 で実装済)
  - XS (極小): time も縮小、`HH:MM` のみ (秒抜き)
- [ ] 横/縦スクロールバー出ない (overflow: hidden + container query で全 size 対応)
- [ ] 文字はみ出しなし (whitespace-nowrap + clamp)
- [ ] hover / focus / pressed / disabled / selected / loading / error 全状態の表現
  - hover: subtle border / shadow
  - focus: ring-2 accent
  - disabled: opacity-40 (将来 widget disable 機能用)
- [ ] keyboard ナビ: Tab で widget focus 可能、Enter で settings open (検討)
- [ ] dark mode / 既存 theme 適合
- [ ] E2E: S サイズ render → date hide / scrollbar 0 を assert
- [ ] reactive: ClockSettings で 12/24h 切替 → widget 即時反映 (PH-479 reactivity 整合)
- [ ] before/after スクショ取得

## 実装ステップ

1. ClockWidget の現状確認 (PH-498 hotfix 後)
2. XS サイズ対応 (container query @max-width: 100px で 秒省略 / `HH:MM` のみ)
3. focus / hover state 強化
4. ClockSettings の form polish は別 plan (Phase C)、ここでは widget 本体のみ
5. E2E spec 追加

## 規約参照

- ux_standards.md (responsive design)
- engineering-principles §6 SFDIPOT
- PH-498 (hotfix で導入した container query をベースに polish)
