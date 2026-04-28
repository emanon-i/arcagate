---
id: PH-issue-012
title: 全 widget 横スクロールバー禁止 (audit script + 修正)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-487 (rollback で revert)、過去 hotfix で WidgetShell に overflow-x 封じ
---

# Issue 12: 全 widget 横スクロールバー禁止

## 元 user fb (検収項目 #16)

> 全 widget で横スクロールバーが出ない、テキストは truncate

## 引用元 doc

- `ux_standards §9` テキスト truncate ルール / `§10` スクロール・レイアウトルール
- `desktop_ui_ux P11` 装飾より対象 (横スクロールは noise)

## Fact

`WidgetShell.svelte` で `overflow-x: hidden` 既設定 (Goal A 状態確認必要)。各 widget content 内の長文 / 横長要素で **意図せず overflow** することがある。

## 横展開

| 領域                            | 対応                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| WidgetShell                     | overflow-x: hidden 維持確認                                                              |
| 各 widget 内 list item          | `min-w-0 flex-1 truncate` 必須 (lessons.md パターン)                                     |
| Settings panel / Library カード | 同様                                                                                     |
| audit script                    | `<div class="...">` で `overflow-x: auto` を持つ component を検出、例外を whitelist 管理 |

## Plan A: audit script + 既存 violations 局所 fix

- `scripts/audit-no-horizontal-scrollbar.sh`: `overflow-x:\s*(auto|scroll)` を検出、whitelist (e.g. WidgetSettingsDialog の long form) 以外は fail
- 既存 violations を 1 件ずつ truncate / `min-w-0` で fix

## 棄却 B: 全 widget 一斉 `overflow-x: hidden` 強制

- 内部 sub-element の意図的 overflow が壊れる、過剰

## E2E

`tests/e2e/widget-no-horizontal-scrollbar.spec.ts`: 全 widget 種別を 1×1 で配置 → 各 widget の bounding box の scrollWidth ≤ clientWidth (横スクロール無し) 検証

## 規格 update

`ux_standards §10` 「Workspace widget は横スクロール禁止、縦スクロールのみ」明記
