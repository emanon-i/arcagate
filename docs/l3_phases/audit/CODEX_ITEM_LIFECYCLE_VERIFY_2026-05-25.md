再調査結果です。既存監査（`docs/l3_phases/audit/CODEX_ITEM_LIFECYCLE_2026-05-25.md`）は大筋正しいですが、以下が漏れ/要補足です。

1. **監査漏れの生成経路**

- `script-folder` は `items` を作らないが `watched_paths` だけ作る（監視は増える）: [ScriptFolderWatchWidget.svelte](/E:/Cella/Projects/arcagate/src/lib/widgets/script-folder/ScriptFolderWatchWidget.svelte), [watched_path_service.rs](/E:/Cella/Projects/arcagate/src-tauri/src/services/watched_path_service.rs)
- CLI 経由の `create_item`/`delete_item`/`import_json`/`delete_workspace` は本番DBを直接変更可能: [arcagate_cli.rs](/E:/Cella/Projects/arcagate/src-tauri/src/bin/arcagate_cli.rs)
- 開発 seed も `create_item` 経由で流入: [seed_dev.rs](/E:/Cella/Projects/arcagate/src-tauri/examples/seed_dev.rs)

2. **削除・保持の抜け（孤立/半端状態リスク）**

- `script-folder` 削除時は `watched_paths` 解除対象外（`extractWatchedPathFromWidget` が exe/projects のみ）で、監視行が残留しうる: [workspace-widgets.svelte.ts](/E:/Cella/Projects/arcagate/src/lib/state/workspace-widgets.svelte.ts)
- watched path の参照判定が「active workspace内のみ」なので、他workspace利用中でも remove され得る（後で自己修復前提）: 同上
- `bulk_delete_items` は single delete と違って `widget_item_hides` 記録・widget config cascade除去なし: [item_service.rs](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs)

3. **import/export 起因の重要なライフサイクル欠損（重大）**

- `import_json` の `INSERT OR REPLACE INTO items` は `source_widget_id/source_entry_key` を書かないため、監視由来back-linkが消える（復活抑止契約が壊れる）: [export_service.rs](/E:/Cella/Projects/arcagate/src-tauri/src/services/export_service.rs)
- 同時に `REPLACE` は row置換なので、既存行の所有文脈を失いやすい（孤立判定の精度低下）

4. **DB制約由来の補足漏れ**

- `items.target` に UNIQUE なし（同一target多重登録はアプリ層依存）: [001_initial.sql](/E:/Cella/Projects/arcagate/src-tauri/migrations/001_initial.sql)
- `watched_paths.path` は UNIQUE だが正規化なし（`C:\x` と `C:/x` は別値として競合回避できず重複監視余地）: [003_watched_paths.sql](/E:/Cella/Projects/arcagate/src-tauri/migrations/003_watched_paths.sql)
- `source_widget_id` は `ON DELETE SET NULL` で「widget削除= item温存（降格）」は仕様通り: [039_items_source_back_link.sql](/E:/Cella/Projects/arcagate/src-tauri/migrations/039_items_source_back_link.sql)

5. **既存監査の結論を補強する確認**

- `watcher remove` は削除しない（イベント通知のみ）: [watcher/mod.rs](/E:/Cella/Projects/arcagate/src-tauri/src/watcher/mod.rs)
- `remove_watched_path` は `is_tracked=1` の配下を削除しwidget参照も掃除: [watched_path_service.rs](/E:/Cella/Projects/arcagate/src-tauri/src/services/watched_path_service.rs)

必要なら、この差分を既存監査MDに追記する形で「漏れ追加版」を作成します。\
（あなたのメッセージ末尾の「特に以下の観点」が途中で切れているので、続きがあればその観点に合わせて再分類します。）
