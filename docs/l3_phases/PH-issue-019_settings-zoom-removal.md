---
id: PH-issue-019
title: Settings からウィジェット拡大率 slider 削除 (Ctrl+wheel 統一)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-495 (rollback で revert)
---

# Issue 19: Settings ズーム slider 削除

## 元 user fb (検収項目 #23)

> Settings 画面のウィジェット拡大率 slider は不要、Ctrl+wheel で十分

## 引用元 doc

- `desktop_ui_ux P3` 主要操作 (認知負荷 ↓) / P10 熟練者効率 / P5 OS 文脈

## Fact

`SettingsPanel.svelte` の Workspace section に widgetZoom slider 存在、Ctrl+wheel と機能重複。

## Plan A: 「slider のみ削除、内部 store 維持」

- SettingsPanel から slider 削除
- `configStore.widgetZoom` は維持 (Ctrl+wheel が書き込む、PH-issue-002 で Ctrl+0 / Ctrl+Shift+1 も追加)

## 棄却 B (store ごと削除): 既存 user の zoom 値が消失、退行

## E2E

Settings > Workspace に widgetZoom slider が存在しないこと検証

## 規格 update

`ux_standards §10` 「zoom UI は Ctrl+wheel + Ctrl+0 + Ctrl+Shift+1 のみ、Settings slider 不採用」明記
