# §1 inventory: UI / store / IPC / DB

Library 関連 code の全 inventory (subagent grep + 自分の trace 結果)。

## 1.1 UI components (Svelte)

### 主体 (Library 専用)

| File                                                               | 責務                                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/components/arcagate/library/LibraryLayout.svelte`         | 3 col grid (sidebar + main + detail)、state 永続化 (sidebarExpanded / activeTag / scrollTop)               |
| `src/lib/components/arcagate/library/LibrarySidebar.svelte`        | 階層 tag sidebar (All / お気に入り / Type filters / Workspace tags / User tags)、各 row に count           |
| `src/lib/components/arcagate/library/LibraryMainArea.svelte`       | grid/list 表示 + 検索 + 単一/bulk 選択 + 空/loading state + drag-drop file 登録                            |
| `src/lib/components/arcagate/library/LibraryCard.svelte`           | item card、lazy metadata fetch (S サイズは省略)、per-card override スタイル、icon 3 mode (image/fill/none) |
| `src/lib/components/arcagate/library/LibraryDetailPanel.svelte`    | 右 panel: icon / type / 起動 button / tag / more menu / star toggle / 削除 confirm / edit                  |
| `src/lib/components/arcagate/library/LibraryItemTagSection.svelte` | tag 管理 sub-component、search-filtered dropdown / add / remove / Esc / arrows                             |

### 主体 (Item 共通)

| File                                            | 責務                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/lib/components/item/ItemFormDialog.svelte` | create/edit modal wrapper、submit error 表示、backdrop escape                             |
| `src/lib/components/item/ItemForm.svelte`       | unified create/update form: type 検出 / drag-drop file/icon / alias CSV / tag multiselect |

### Workspace 結合

| File                                                             | 責務                                                            |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/lib/components/arcagate/workspace/LibraryItemPicker.svelte` | widget 用 item 選択 modal (single + multi w/ checkbox)          |
| `src/lib/components/arcagate/workspace/ItemContextMenu.svelte`   | 右クリック menu (open with opener、default 設定、settings link) |

## 1.2 State / store

| File                                      | 内容                                                                                                                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/state/items.svelte.ts` (~168 行) | items / tags / libraryStats / tagWithCounts / tagItems / loading / error。mutations: loadItems / loadTags / loadLibraryStats / loadTagWithCounts / loadItemsByTag / createItem / updateItem / deleteItem / toggleStar / createTag |
| `src/lib/state/config.svelte.ts`          | itemSize (S/M/L) / libraryCard (background mode / style) を localStorage 永続化                                                                                                                                                   |
| `src/lib/state/workspace.svelte.ts`       | 別 store (workspace 用)、items は cross-link で参照のみ                                                                                                                                                                           |

## 1.3 IPC commands (`src-tauri/src/commands/item_commands.rs`、25 件)

### Item CRUD (sync IPC)

- `cmd_create_item(input) → Item`
- `cmd_list_items() → Vec<Item>` (Library 起動時 1 回)
- `cmd_search_items(query) → Vec<Item>` (legacy、現 UI 未使用)
- `cmd_update_item(id, input) → Item`
- `cmd_delete_item(id) → ()`
- `cmd_count_item_references(id) → usize` (削除時 widget 参照数 check)

### Tag

- `cmd_get_tags() → Vec<Tag>`
- `cmd_create_tag(input) → Tag`
- `cmd_update_tag(id, name, is_hidden) → ()`
- `cmd_update_tag_prefix(id, prefix) → ()`
- `cmd_delete_tag(id) → ()`
- `cmd_get_item_tags(item_id) → Vec<Tag>`
- `cmd_get_tag_counts() → Vec<TagWithCount>`
- `cmd_search_items_in_tag(tagId, query) → Vec<Item>` (現役 filter 経路)

### Bulk (transactions、max 1000)

- `cmd_bulk_add_tag(item_ids, tag_id) → usize`
- `cmd_bulk_remove_tag(item_ids, tag_id) → usize`
- `cmd_bulk_delete_items(item_ids) → usize`

### Stats / metadata

- `cmd_get_library_stats() → LibraryStats`
- `cmd_get_item_metadata(item_id) → ItemMetadata` ← **I3 主犯** (LibraryCard の $effect で 69 並列発火)
- `cmd_toggle_star(item_id, starred) → Item`
- `cmd_count_hidden_items() → i64`

### Registration / scan

- `cmd_auto_register_folder_items(rootPath) → Vec<Item>`
- `cmd_register_exe_item(path, label) → Item`
- `cmd_register_exe_items_bulk(paths) → Vec<Item>`
- `cmd_extract_item_icon(exe_path) → String` ← **同期 IPC、Lessons.md C-2**
- `cmd_check_is_directory(path) → bool`

### TS wrapper: `src/lib/ipc/items.ts` (~100 行)

## 1.4 DB schema (`src-tauri/migrations/`)

### コア (001_initial.sql + 後発拡張)

- **items** (id PK / item_type / label / target / args / working_dir / icon_path / icon_type / aliases JSON / sort_order / is_enabled / created_at / updated_at)
  - idx: type / label / enabled
- **tags** (id PK / name UNIQUE / is_hidden + 008 で is_system / prefix / icon / sort_order 追加)
  - 自動 system tags: `sys-starred`, `sys-type-{exe/url/folder/script/command}`, `sys-ws-{wsId}`
- **item_tags** (item_id FK / tag_id FK 複合 PK)
- **launch_log** (id PK / item_id FK / launched_at / launch_source: 'palette'|'tray'|'cli'|'mcp')
  - **I1 関連**: ExeFolderWatchWidget は cmd_open_path 経由なので launch_log に書かれない
- **item_stats** (item_id PK / launch_count / last_launched_at) — 非正規化 stats

### 拡張

- **config** (key PK / value)
- **workspaces** (004) / **workspace_widgets**
- **watched_paths** (003) (id / path UNIQUE / label / is_active)
- **widget_item_settings** (019) (item_key=item.target PK / settings_json / last_seen_at) — watched_path unset → 再 watch で settings 復元
- **openers** (020) (id "user:*" PK / name / command_template `<path>` / icon_path / sort_order)

## 1.5 Routing / entry

### Main

- `src/routes/+page.svelte`: Tab toggle (Library / Workspace)、`activeView` を localStorage `arcagate.app.activeView` に保存

### Mount tree

```
+page.svelte → LibraryLayout → [LibrarySidebar / LibraryMainArea / LibraryDetailPanel]
                            → ItemFormDialog (modal、callback で trigger)
```

- **Library 専用 route なし** (deep link 不可: `/library/:itemId` 等は実装されていない)
- 選択 state は LibraryLayout 内 local state

## 1.6 補足 inventory

### CLI / 外部 entry

- `src-tauri/src/bin/arcagate_cli.rs`: launch-by-id を MCP / CLI から発火
- `src-tauri/src/services/launch_service.rs::launch_item(db, item_id, source)`: 共通 launch 経路、source パラメータで launch_log の origin を区別

### File counts (概算)

- Library 専用 svelte: 6 file
- 共通 item svelte: 2 file
- workspace 結合 svelte: 2 file
- store: 1 file (~168 行)
- IPC commands (Rust): 25 件 / 1 file
- DB tables: 8 (Library 関連)
- migrations: 21 (021 が最新)

## 1.7 不確かな点 (要 user / 要検証)

- **(中)** ItemForm の sync `await extractItemIcon` (drag-drop 時 EXE icon 抽出) が UI block 起こすか要計測 (I3 関連)
- **(低)** widget_item_settings の `last_seen_at` ベースの GC ポリシーが実装されているか要 grep 確認
