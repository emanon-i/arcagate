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
を削除すると除外リストは FK CASCADE で消える (fresh state)。 除外を解除する復元 UI は widget
設定の「除外したアイテム」 section (PH-CF-500、 `WidgetExcludedItemsSection`) に置く。

機械検出:

- 統合 test `test_exe_folder_auto_register_delete_no_resurrection` (PH-CF-400 で entry_keys 明示版)
- 統合 test `test_register_exe_items_bulk_entry_keys_fallback_to_parent` (entry_keys None back-compat)
- e2e: `widget-excluded-items-restore.spec.ts` (UI 経路の Library 削除 → section 表示 → 復元 → 復活)
- [item-service.md](../backend/item-service.md) §監視アイテムの所有関係契約 + [exe-scanner.md](../backend/exe-scanner.md) §scan reconcile 契約 と同根

### 監視ウィジェット族 chrome 契約 (PH-CF-500 D3)

`projects` / `exe_folder` / `script_folder` の chrome は [`_chrome-consistency.md`](./_chrome-consistency.md)
§A5 「監視ウィジェット族契約」 に従う。 特に: WidgetShell の `icon` は `index.ts` meta と一致
(`exe_folder` は `FolderOpen` で meta = shell)、 `config.watch_path` を `path` prop で渡す、
config パースは `parseWidgetConfig` helper を使う。

### 起動 cascade (PH-CF-500 D4)

`default_opener_id` を `WidgetSettings` で設定可能。 entry click は
`launchItemWithCascade(item, { widgetDefaultOpenerId: config.default_opener_id })` で
**item-level override → widget default → system default** の順に解決する。 widget default は
opener registry (`opener_service`) の id を参照、 未指定 (`null`) なら system default
(`cmd_open_path`) にフォールバック。 同 cascade は `projects` widget も使用。

#### 右クリック「デフォルトアプリで開く」 の cascade 同等性契約 (PH-CF-1200 ⑨)

widget 内アイテムの **右クリック context menu「デフォルトアプリで開く」** は、 **同じ entry の
click 経路 (`launchEntry` / `handleLaunch`) と同一の cascade** を通る:

- caller widget は `workspaceContextMenuStore.openMenuFor({ widgetDefaultOpenerId: config.default_opener_id, ... })`
  で context menu store に widget opener を伝播する (`default_opener_id` を持つ widget はすべて必須)
- `WidgetItemContextMenu.handleLaunchDefault` は `launchItemWithCascade(item, { widgetDefaultOpenerId })`
  で同 helper を呼ぶ → 結果として「click と右クリック→デフォルトで開く」 で **同じ opener / 同じ
  起動 path / 同じ i18n エラー文言 (`formatLaunchError`)** が出る
- 旧実装は context menu 側が ctx 引数を渡さず widget opener を完全無視 + エラー文言も `launch_failed`
  生文字列で乖離していた (PH-CF-1200 ⑨ root cause)

機械検出: `scripts/audit-widget-context-opener.sh` で「`launchItemWithCascade` に
`widgetDefaultOpenerId` を渡す widget は、 同 component の `workspaceContextMenuStore.openMenuFor`
呼出にも `widgetDefaultOpenerId` を渡している」 を grep 化された静的 audit で検出。

### Library item.target 同期契約 (PH-CF-1200 ⑧)

user が widget 内の起動 EXE を切り替えると、 `config.item_overrides[folderPath] = exe_path` が
保存され、 次 scan の `cmd_register_exe_items_bulk` に **override 反映後の path** が渡る。
backend は `register_exe_item_on_conn` の source 経由 (`find_by_source`) で既存 item を再発見し、
新 path と既存 `target` が異なれば、 同 transaction 内で `item_repository::set_source_target` で
`target` (+ 派生 `label`) を新 path に書き戻す。 user 編集列 (`args` / `default_app` /
`card_override_json` / `aliases` / `is_tracked` / `icon_path`) は touch しない契約。

これにより:

- Library 経路の launch (item.target ベース) で正しい EXE が起動される
- widget 内の右クリック「デフォルトアプリで開く」 (item-level cascade) も新 path で開く
- 旧実装は item をそのまま return しており、 切替後の Library 起動で "not found" を起こしていた

詳細は [`cross-cutting/item-lifecycle.md`](../cross-cutting/item-lifecycle.md) U-10。
test: `test_register_exe_items_bulk_overrides_existing_target` /
`test_register_exe_items_bulk_target_sync_preserves_user_edits`。

## 既知の判断

- U-4 で scan 対象に script (.bat / .cmd / .ps1 / .sh) も含む拡張 (default extensions に統合)
- PH-CF-100 (2026-05-23) で `cmd_register_exe_items_bulk` に `sourceWidgetId` 引数を追加
- PH-CF-400 (2026-05-23) で walk を「第1階層フォルダ単位 entry」 に再設計、 監視拡張子を引数化、
  scan_depth 上限を 10 に緩和。 `cmd_register_exe_items_bulk` に `entryKeys` 引数 (paths と同順で
  scan の `folder_path` を渡す) を追加し、 source_entry_key と scan entry id を厳密一致させる
