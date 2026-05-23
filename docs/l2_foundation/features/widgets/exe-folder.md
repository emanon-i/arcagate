# Exe Folder Watch Widget

> widgetType: `exe_folder` / category: watch / 配置画面: [Workspace](../screens/workspace.md)

## 目的

指定フォルダ配下の対象ファイル (実行ファイル / スクリプト / 任意拡張子) を自動列挙し、 ワンクリック起動できる widget。 第1階層フォルダごとに 1 entry でラベル並ぶ。

## やること (必要処理)

- `cmd_scan_exe_folders` で指定 path / scan_depth (1..=10) / **extensions** を再帰 scan (stale response は破棄)
- scan 結果は **第1階層フォルダごとに 1 entry**、 配下から「浅い + サイズ大優先」 で default 候補を 1 つ選択
- 発見した対象ファイルを `cmd_register_exe_items_bulk` で Library に冪等登録 (entryKeys = 第1階層フォルダ folder_path を paths と同順で送る)
- 監視 path を `cmd_add_watched_path` で FS watcher に登録 (UNIQUE 重複は silent skip)
- sort (name / mtime)、 per-widget hide フィルタ、 list / card view 切替
- 同フォルダ内に複数候補があれば popover で選択、 選択を `item_overrides` config に永続化 (key = `folder_path`)
- item 登録済なら cascade 起動、 未登録は `cmd_open_path` で fallback

## やらないこと (禁止 / scope 外)

- 対象ファイルを自動実行しない (列挙のみ。 user click で起動)
- scan_depth を `MAX_SCAN_DEPTH=10` より深くしない (depth 上限固定)
- 対象ファイルの中身を解析しない (icon 抽出は backend / 登録時の責務)
- scan を frontend で同期実行しない (backend に委譲、 cancel 可能)
- 監視拡張子をハードコードしない (config `extensions` 経由で widget ごとに設定)

## 性能予算

- file system scan は backend 側 IO heavy、 searchId で cancel 可能
- depth が深い / フォルダが巨大だと scan に時間がかかる → loading 表示
- widget resize 時に entries が reset しないよう prevPath / prevDepth / prevExtensions で再 scan を抑制

## 副作用 (state 変化 / persistence)

- `items` / `item_tags` テーブルへ exe item を bulk 登録 (entry_key = 第1階層フォルダ folder_path、 PH-CF-400)
- `watched_paths` テーブルへ監視 path を追加
- widget config (`watch_path` / `scan_depth` / `extensions` / `title` / `description` / `item_overrides` / `sort_field` / `sort_order` / `default_opener_id` / `view_mode`) を保存

## 依存

- IPC: `cmd_scan_exe_folders` / `cmd_register_exe_items_bulk` / `cmd_add_watched_path` / `cmd_launch_item` / `cmd_open_path`
- DB: `items` / `item_tags` / `watched_paths`
- config schema: `watch_path` / `scan_depth` (1..=10, default 2) / `extensions` (string[], default `["exe","bat","cmd","ps1","sh"]`) / `item_overrides` (Record) / `sort_field` / `sort_order` / `default_opener_id` / `title` / `description` / `view_mode`
- backend: [Exe Scanner](../backend/exe-scanner.md) / [Folder Watch Service](../backend/folder-watch.md) / [Launcher](../backend/launcher.md)

## 機能契約

### 検出ロジック契約 (PH-CF-400)

- entry 単位 = **Root 直下の第1階層フォルダ** (1 第1階層 = 最大 1 entry、 重複ラベル禁止)
- entry の identity = **第1階層フォルダの正規化済 絶対パス** (forward slash / 末尾 separator 除去)
- 配下を `scan_depth` まで再帰し、 「**浅い階層優先 → 同一階層はサイズ大優先**」 で 1 ファイルを default 選択 (= `exe_candidates[0]`)
- 対象ファイル 0 件の第1階層フォルダは entry を出さない
- 列挙順 deterministic (第1階層フォルダ path 昇順)
- `extensions` (可変、 widget config 起点) / `scan_depth` (1..=10) は widget 設定で変更可能。 default `extensions = ["exe","bat","cmd","ps1","sh"]` / `scan_depth = 2`

機械検出: [exe-scanner.md](../backend/exe-scanner.md) §EXE フォルダ検出契約 (Rust unit test 群)

### 監視ウィジェットの除外契約 (PH-CF-100)

自動登録した Library item を user が削除したら、 当該 widget の除外リスト
(`widget_item_hides`、 key = `source_entry_key` = **第1階層フォルダの正規化済 絶対パス**) に
記録し、 **再 scan で復活させない**。 item.target は対象ファイル path、 entry_key は第1階層
フォルダで key 空間が異なるため、 hide の橋渡しは `source_entry_key` 経由で 1 系統に揃える
(`item_target` 列のセマンティクスは scan entry id = 第1階層フォルダ folder_path)。 widget 自体
を削除すると除外リストは FK CASCADE で消える (fresh state)。 復元 UI は PH-CF-500。

機械検出:

- 統合 test `test_exe_folder_auto_register_delete_no_resurrection` (PH-CF-400 で entry_keys 明示版)
- 統合 test `test_register_exe_items_bulk_entry_keys_fallback_to_parent` (entry_keys None back-compat)
- [item-service.md](../backend/item-service.md) §監視アイテムの所有関係契約 + [exe-scanner.md](../backend/exe-scanner.md) §scan reconcile 契約 と同根

## 既知の判断

- U-4 で scan 対象に script (.bat / .cmd / .ps1 / .sh) も含む拡張 (default extensions に統合)
- PH-CF-100 (2026-05-23) で `cmd_register_exe_items_bulk` に `sourceWidgetId` 引数を追加
- PH-CF-400 (2026-05-23) で walk を「第1階層フォルダ単位 entry」 に再設計、 監視拡張子を引数化、
  scan_depth 上限を 10 に緩和。 `cmd_register_exe_items_bulk` に `entryKeys` 引数 (paths と同順で
  scan の `folder_path` を渡す) を追加し、 source_entry_key と scan entry id を厳密一致させる
