# Exe Folder Watch Widget

> widgetType: `exe_folder` / category: watch / 配置画面: [Workspace](../screens/workspace.md)

## 目的

指定フォルダ配下の実行ファイル (.exe 等) を自動列挙し、ワンクリック起動できる widget。フォルダに exe を置くだけで launcher に並ぶ。

## やること (必要処理)

- `cmd_scan_exe_folders` で指定 path / scan_depth (1-3) を再帰 scan (stale response は破棄)
- 発見した exe を `cmd_register_exe_items_bulk` で Library に冪等登録
- 監視 path を `cmd_add_watched_path` で FS watcher に登録 (UNIQUE 重複は silent skip)
- sort (name / mtime)、per-widget hide フィルタ、list / card view 切替
- 同フォルダに複数 exe がある時は候補 popover で選択、選択を override config に永続化
- item 登録済なら cascade 起動、未登録は `cmd_open_path` で fallback

## やらないこと (禁止 / scope 外)

- exe を自動実行しない (列挙のみ。起動は user click)
- scan_depth を 3 より深くしない (depth 上限固定)
- exe の中身を解析しない (icon 抽出は backend / 登録時の責務)
- scan を frontend で同期実行しない (backend に委譲、cancel 可能)

## 性能予算

- file system scan は backend 側 IO heavy、searchId で cancel 可能
- depth が深い / フォルダが巨大だと scan に時間がかかる → loading 表示
- widget resize 時に entries が reset しないよう prevPath / prevDepth で再 scan を抑制

## 副作用 (state 変化 / persistence)

- `items` / `item_tags` テーブルへ exe item を bulk 登録
- `watched_paths` テーブルへ監視 path を追加
- widget config (`watch_path` / `scan_depth` / `title` / `description` / `item_overrides` / `sort_field` / `sort_order` / `default_opener_id` / `view_mode`) を保存

## 依存

- IPC: `cmd_scan_exe_folders` / `cmd_register_exe_items_bulk` / `cmd_add_watched_path` / `cmd_launch_item` / `cmd_open_path`
- DB: `items` / `item_tags` / `watched_paths`
- config schema: `watch_path` / `scan_depth` (1-3, default 2) / `item_overrides` (Record) / `sort_field` / `sort_order` / `default_opener_id` / `title` / `description` / `view_mode`
- backend: [Exe Scanner](../backend/exe-scanner.md) / [Folder Watch Service](../backend/folder-watch.md) / [Launcher](../backend/launcher.md)

## 機能契約

### 監視ウィジェットの除外契約 (PH-CF-100)

自動登録した Library item を user が削除したら、 当該 widget の除外リスト
(`widget_item_hides`、 key = `source_entry_key` = 第1階層フォルダ = exe の **parent folder** の
正規化済 絶対パス) に記録し、 **再 scan で復活させない**。 item.target は exe ファイルパス、
entry_key は parent folder と key 空間が異なるため、 hide の橋渡しは `source_entry_key` 経由で
1 系統に揃える (`item_target` 列のセマンティクスは scan entry id = parent folder)。 widget 自体
を削除すると除外リストは FK CASCADE で消える (fresh state)。 復元 UI は PH-CF-500。

機械検出:

- 統合 test `test_exe_folder_auto_register_delete_no_resurrection`
- [item-service.md](../backend/item-service.md) §監視アイテムの所有関係契約 + [exe-scanner.md](../backend/exe-scanner.md) §scan reconcile 契約 と同根

## 既知の判断

- U-4 で scan 対象に script (.bat / .cmd / .ps1 / .sh) も含む拡張
- PH-CF-100 (2026-05-23) で `cmd_register_exe_items_bulk` に `sourceWidgetId` 引数を追加、
  widget が自分の id を渡すと entry_key (= parent folder) で back-link が埋まる。
