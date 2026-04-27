---
id: PH-20260428-492
title: WatchFolder Widget 配置直後のアイテム残存問題 fix (state 初期化)
status: done
batch: 108
pr: 192
merged_at: 2026-04-27T16:47:49Z
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte
  - src/lib/state/workspace.svelte.ts
---

# PH-492: WatchFolder Widget 配置直後のアイテム残存問題

## 背景

ユーザー dev fb (2026-04-28):

> あとウォッチフォルダウィジット、配置したときにもうアイテムはいてるのなんで？

新規配置 widget (workspaceStore.addWidgetAt 経由) でも、内部 entries が前 instance の cache を保持しているように見える。
新規 widget 配置時は **空 state で確保**、scan は config 設定後に開始するべき。

## 受け入れ条件

- [ ] **新 widget instance は空 state**: `entries = []` で初期化、folder_path 未設定なら scan 起こさない
- [ ] **config (folder_path) 設定後に scan**: `$effect` で folder_path 監視、未設定 → 「フォルダを選択してください」zero state
- [ ] **既存配置の widget は影響なし**: 既存 config (folder_path 設定済) は再 scan のみ
- [ ] **PH-490 と整合**: path 変更で reset、新規配置で空 = 同じ logic

### 仮説

- ExeFolderWidget で module-scope の `let entries = $state([])` でなく、**global cache** を参照している
- 全 instance で同じ array を共有 → 新 widget でも前 widget の entries 表示
- fix: 各 component instance で `let entries = $state<Entry[]>([])` に修正

### SFDIPOT

- F: 新規配置 → 空 state、folder_path 設定 → scan 起動
- D: entries は component-scope state、外部 store には置かない
- T: scan 起動は config 確定後 100ms 程度

## 実装ステップ

1. ExeFolderWatchWidget.svelte の現状確認 (entries 宣言、$effect 依存)
2. global cache がある場合 component-scope に移行
3. folder_path 未設定時の zero state UI 追加
4. E2E: 「workspace に widget 配置 → folder_path 未設定なら空状態」を assert

## 規約参照

- engineering-principles §3 (state ownership)
- HICCUPPS [User] 「配置直後はクリーン」期待
