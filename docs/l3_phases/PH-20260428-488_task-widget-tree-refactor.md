---
id: PH-20260428-488
title: タスク Widget リファクタ (文字サイズ大きく + 完了/未完了ツリー分割)
status: todo
batch: 108
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/daily-task/DailyTaskWidget.svelte
---

# PH-488: タスク Widget リファクタ

## 背景

ユーザー dev fb (2026-04-28):

> タスクの文字サイズ小さすぎ。これバッジ系の文字サイズじゃね？
> あと完了済みと未完了でツリー？で分けようイメージわかるか？

## 受け入れ条件

- [ ] **文字サイズ昇格**: タスクテキストを `text-ag-xs` → `text-ag-sm` (13px) または `text-ag-md` (15px)
- [ ] **ツリー分割**: ルート 2 group → 「未完了 (N)」「完了済み (N)」、各 group は折りたたみ可能 (`<details>` or 自前 toggle)
- [ ] **未完了 default 展開**、**完了済み default 折りたたみ**
- [ ] **空 state**: 各 group で「タスクなし」表示
- [ ] **チェック → 即時反映**: 完了 toggle で「完了済み」group へ移動 (animation オプション)
- [ ] container query で responsive (S サイズで group header 縮小)

### SFDIPOT

- F: 完了 toggle で group 移動、永続化 (config or DB)
- D: tasks: `Array<{ id, text, done }>`、config に保存
- T: 切替 instant、保存 IPC < 50ms

## 実装ステップ

1. DailyTaskWidget.svelte の中身を確認 (現状の data shape)
2. 「未完了」「完了済み」derived 分割
3. 各 group を `<details open>` (未完了 open、完了 close) で折りたたみ
4. text-xs → text-ag-sm 統一
5. WidgetShell 側で overflow-y-auto なので長い list は scroll、各 group も自然 scroll

## 規約参照

- ux_standards.md (font hierarchy)
- PH-475 font tokens (text-ag-* 体系維持)
