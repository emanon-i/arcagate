# フォルダ監視 Widget (Projects)

> widgetType: `projects` / category: watch / 配置画面: [Workspace](../screens/workspace.md)

## 目的

指定した監視フォルダ配下のサブフォルダ (Git プロジェクト) を列挙し、branch 名と変更状態を表示する widget。click で起動できる。

## やること (必要処理)

- 監視フォルダ配下の子フォルダを `cmd_auto_register_folder_items` で Library に自動登録
- `cmd_get_git_statuses_batch` で各フォルダの git status を batch 取得 (scan 完了時の 1 回のみ。 周期 polling は持たない)
- `cmd_get_folder_mtimes_batch` で mtime を取得し動的ソート (name / mtime)
- card / list の view 切替、item click で `widgetDefaultOpenerId` cascade 起動
- 設定 dialog 内の「除外したアイテム」 section で `widget_item_hides` の復元 UI を提供

## やらないこと (禁止 / scope 外)

- フォルダ配下を再帰的に深く scan しない (直下のサブフォルダのみ)
- git の commit / pull / push 等の操作をしない (status 表示のみ)
- git status を 1 フォルダずつ個別 IPC で取らない (必ず batch)
- git status の周期 polling を持たない (PH-CF-500 D2: scan 完了時の 1 回 fetch のみ)
- `folder://new-directory` event の auto-add 機構を持たない (PH-CF-500 D2 で撤廃)
- 「表示件数」 cap を config で持たない (PH-CF-500 D2 で撤廃、 WidgetShell scroll で吸収)

## 性能予算

- git status は batch IPC で N+1 回避 (scan 完了時の 1 回 fetch のみ)
- 初回 `auto_register_folder_items` は監視フォルダが巨大だと scan + DB 登録に時間がかかる (backend 側で実行)
- mtime batch は stat のみで軽量

## 副作用 (state 変化 / persistence)

- `items` / `item_tags` テーブルへフォルダ item を登録
- widget config (`watched_folder` / `title` / `description` / `sort_field` / `sort_order` / `view_mode` / `default_opener_id`) を保存
- 登録後に itemStore / library 統計を再同期

## 依存

- IPC: `cmd_auto_register_folder_items` / `cmd_get_git_statuses_batch` / `cmd_get_folder_mtimes_batch` / `cmd_launch_item` / `cmd_list_widget_item_hides` / `cmd_remove_widget_item_hide`
- DB: `items` / `item_tags` / `watched_paths` / `widget_item_hides`
- config schema: `watched_folder` / `title` / `description` / `sort_field` / `sort_order` / `view_mode` / `default_opener_id`
- backend: [Folder Watch Service](../backend/folder-watch.md) / [Item Service](../backend/item-service.md)

## 機能契約

### 監視ウィジェットの除外契約 (PH-CF-100)

自動登録した Library item を user が削除したら、 当該 widget の除外リスト
(`widget_item_hides`、 key = `source_entry_key` = subfolder の正規化済 絶対パス) に記録し、
**再 scan で復活させない**。 widget 自体を削除すると除外リストは FK CASCADE で消える
(fresh state)。 除外を解除する復元 UI は widget 設定の「除外したアイテム」 section
(PH-CF-500、 `WidgetExcludedItemsSection`) に置く。

機械検出:

- 統合 test `test_projects_auto_register_delete_no_resurrection` / `test_projects_auto_register_unhide_resurrects`
- [item-service.md](../backend/item-service.md) §監視アイテムの所有関係契約 と同根

### 監視ウィジェット族 chrome 契約 (PH-CF-500 D3)

`projects` / `exe_folder` / `script_folder` の chrome は [`_chrome-consistency.md`](./_chrome-consistency.md)
§A5 「監視ウィジェット族契約」 に従う (WidgetShell prop / icon meta=shell 一致 /
description 配置 / config パース helper / sort sticky bar)。 個別差分は許容しない。

### 起動 cascade (PH-CF-500 D4)

`default_opener_id` を `WidgetSettings` で設定可能。 item click は
`launchItemWithCascade(item, { widgetDefaultOpenerId: config.default_opener_id })` で
**item-level override → widget default → system default** の順に解決する
(`exe_folder` と同 pattern)。 機械検出は [exe-folder.md](./exe-folder.md) §起動 cascade と共通。

## 既知の判断

- icon / label は「フォルダ監視」で WIDGET_LABELS に統一
- `cmd_auto_register_folder_items` に `sourceWidgetId` を渡すと back-link が埋まり逆方向ライフサイクル契約に乗る (widget が自分の id を渡す)
- git poll / max_items / auto_add の設定は持たない
  「監視 = 常時自動」 を default 契約とし、 monitor widget 族 (exe_folder / script_folder /
  projects) の posture に揃える。
