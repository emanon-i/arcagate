# フォルダ監視 Widget (Projects)

> widgetType: `projects` / category: watch / 配置画面: [Workspace](../screens/workspace.md)

## 目的

指定した監視フォルダ配下のサブフォルダ (Git プロジェクト) を列挙し、branch 名と変更状態を表示する widget。click で起動できる。

## やること (必要処理)

- 監視フォルダ配下の子フォルダを `cmd_auto_register_folder_items` で Library に自動登録
- `cmd_get_git_statuses_batch` で各フォルダの git status を batch 取得 (poll: `git_poll_interval_sec`、default 60 秒)
- `cmd_get_folder_mtimes_batch` で mtime を取得し動的ソート (name / mtime)
- card / list の view 切替、item click で起動
- `auto_add: true` の時、`folder://new-directory` イベントで新規サブフォルダを自動登録

## やらないこと (禁止 / scope 外)

- フォルダ配下を再帰的に深く scan しない (直下のサブフォルダのみ)
- git の commit / pull / push 等の操作をしない (status 表示のみ)
- git status を 1 フォルダずつ個別 IPC で取らない (必ず batch)
- poll 間隔を短くしすぎない (最小 10 秒)

## 性能予算

- git status は batch IPC で N+1 回避。poll default 60 秒
- 初回 `auto_register_folder_items` は監視フォルダが巨大だと scan + DB 登録に時間がかかる (backend 側で実行)
- mtime batch は stat のみで軽量

## 副作用 (state 変化 / persistence)

- `items` / `item_tags` テーブルへフォルダ item を登録
- widget config (`watched_folder` / `max_items` / `git_poll_interval_sec` / `auto_add` / `title` / `description` / `sort_field` / `sort_order` / `view_mode`) を保存
- 登録後に itemStore / library 統計を再同期

## 依存

- IPC: `cmd_auto_register_folder_items` / `cmd_get_git_statuses_batch` / `cmd_get_folder_mtimes_batch` / `cmd_launch_item`
- event: `folder://new-directory`
- DB: `items` / `item_tags` / `watched_paths`
- config schema: `watched_folder` / `max_items` (1-100) / `git_poll_interval_sec` (10-600) / `auto_add` / `title` / `description` / `sort_field` / `sort_order` / `view_mode`
- backend: [Folder Watch Service](../backend/folder-watch.md) / [Item Service](../backend/item-service.md)

## 機能契約

### 監視ウィジェットの除外契約 (PH-CF-100)

自動登録した Library item を user が削除したら、 当該 widget の除外リスト
(`widget_item_hides`、 key = `source_entry_key` = subfolder の正規化済 絶対パス) に記録し、
**再 scan で復活させない**。 widget 自体を削除すると除外リストは FK CASCADE で消える
(fresh state)。 除外を解除する復元 UI は widget 設定に置く (UI 仕様は PH-CF-500)。

機械検出:

- 統合 test `test_projects_auto_register_delete_no_resurrection` / `test_projects_auto_register_unhide_resurrects`
- [item-service.md](../backend/item-service.md) §監視アイテムの所有関係契約 と同根

## 既知の判断

- icon / label は「フォルダ監視」で WIDGET_LABELS に統一 (旧「プロジェクト」から変更、PH-issue-039)
- PH-CF-100 (2026-05-23) で `cmd_auto_register_folder_items` に `sourceWidgetId` 引数を追加、
  widget が自分の id を渡すと back-link が埋まり逆方向ライフサイクル契約に乗る。
