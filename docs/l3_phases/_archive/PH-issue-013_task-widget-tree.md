---
id: PH-issue-013
title: タスク Widget — 文字サイズ昇格 + 完了/未完了ツリー分割
status: done
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-488 (rollback で revert)
---

# Issue 13: タスク Widget polish

## 元 user fb (検収項目 #17)

> DailyTaskWidget の文字が小さい、完了 / 未完了がフラットに混在で読みにくい
> → 文字サイズ昇格 + ツリー分割 (未完了上、完了下に折りたたみ可能)

## 引用元 doc

- `ux_standards §4-2` タイポ / `§6-1` Widget 仕様
- `desktop_ui_ux P3` 主要操作 (未完了が上に来るべき) / P8 読み順
- `arcagate-visual-language` 「よく磨かれた工具」(派手にしない)

## Fact

`src/lib/widgets/daily-task/DailyTaskWidget.svelte` Goal A 時点:

- 全タスクが list で混在表示
- 文字サイズは `text-sm` (~14px)、user 「小さい」感あり

## UX 本質

- 未完了 = 主操作 (今やること) → 上、大きく、目立つ
- 完了 = 補助情報 → 下、折りたたみ可能、控えめ

## 横展開

| 領域                            | 対応                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| DailyTaskWidget.svelte          | 未完了 / 完了で 2 セクション、デフォルト完了は折りたたみ         |
| 文字サイズ                      | task title `text-base` (~16px)、補助情報 (起算日等) は `text-xs` |
| 既存 add / toggle / delete 動作 | 維持                                                             |

## Plan A: 「2 セクション + 文字サイズ昇格 + 折りたたみ default 完了」

- 未完了 list (上、`text-base font-medium`)
- 区切り horizontal rule + 「完了済 (N) ▼」 toggle button
- 完了 list (下、デフォルト hidden、`text-sm text-muted line-through`)
- 完了 toggle 時にアニメーション (`--ag-duration-fast`)

## 棄却 B/C 略

## E2E

タスク 3 件追加 (2 件完了) → 未完了 2 件が上、「完了済 (1) ▼」 toggle で 1 件展開

## 規格 update

`ux_standards §6-1` に DailyTask 個別 section 追加 (もしくは widget polish 系の節新設)
