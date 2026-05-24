**1) CREATION patterns**

- `[manual-create-item]` trigger: Library “new item” UI -> IPC `create_item` / call-chain: `itemStore.createItem` -> `ipc createItem` -> `cmd_create_item` -> `ItemService::create_item` -> `item_repository::insert` ([items.svelte.ts:110](/E:/Cella/Projects/arcagate/src/lib/state/items.svelte.ts:110), [items.ts:3](/E:/Cella/Projects/arcagate/src/lib/ipc/items.ts:3), [item_commands.rs:8](/E:/Cella/Projects/arcagate/src-tauri/src/commands/item_commands.rs:8), [item_service.rs:28](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:28), [item_repository.rs:6](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/item_repository.rs:6)).\
  Items: inserts one row; `source_widget_id=NULL`, `source_entry_key=NULL`; `is_tracked` comes from input ([item_service.rs:52](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:52), [item_service.rs:54](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:54)).\
  Refs: auto tag `sys-type-*`, optional user tags ([item_service.rs:68](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:68), [item_service.rs:73](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:73)). Dedupe: none in this path.

- `[auto-register-folder-item]` trigger: Projects widget `$effect` when `watched_folder` changes / call-chain: `ProjectsWidget` -> `autoRegisterFolderItems` -> `cmd_auto_register_folder_items` -> `ItemService::auto_register_folder_items` -> `insert` ([ProjectsWidget.svelte:211](/E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:211), [items.ts:85](/E:/Cella/Projects/arcagate/src/lib/ipc/items.ts:85), [item_commands.rs:195](/E:/Cella/Projects/arcagate/src-tauri/src/commands/item_commands.rs:195), [item_service.rs:374](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:374), [item_repository.rs:6](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/item_repository.rs:6)).\
  Items: inserts folder rows with `is_tracked=true`; sets `source_widget_id/source_entry_key` when source widget provided ([item_service.rs:449](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:449), [item_service.rs:451](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:451)).\
  Refs: auto tags `sys-type-folder` and optional `sys-ws-*` ([item_service.rs:458](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:458), [item_service.rs:468](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:468)).\
  Dedupe: by `(source_widget_id,source_entry_key)` if source present, else by `target` ([item_service.rs:410](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:410), [item_service.rs:416](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:416)).\
  Hide-aware: skips if hidden in `widget_item_hides` ([item_service.rs:394](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:394), [item_service.rs:422](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:422)).

- `[register-exe-item-single]` trigger: explicit IPC `registerExeItem` / call-chain: `ipc registerExeItem` -> `cmd_register_exe_item` -> `ItemService::register_exe_item` -> `register_exe_item_on_conn` -> `insert` ([items.ts:112](/E:/Cella/Projects/arcagate/src/lib/ipc/items.ts:112), [item_commands.rs:215](/E:/Cella/Projects/arcagate/src-tauri/src/commands/item_commands.rs:215), [item_service.rs:486](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:486), [item_service.rs:505](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:505)).\
  Items: `is_tracked=true`; source fields are NULL in this path (`source=None`) ([item_service.rs:495](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:495), [item_service.rs:569](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:569)).\
  Refs: auto type tag (`sys-type-exe`/`sys-type-script`) and optional `sys-ws-*` ([item_service.rs:543](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:543), [item_service.rs:582](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:582)).\
  Dedupe: by source key (if source provided) else by target ([item_service.rs:518](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:518), [item_service.rs:530](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:530)). Hide-aware skip when source provided ([item_service.rs:524](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:524)).

- `[register-exe-items-bulk]` trigger: ExeFolder widget scan completion / call-chain: `ExeFolderWatchWidget` -> `registerExeItemsBulk` -> `cmd_register_exe_items_bulk` -> `ItemService::register_exe_items_bulk` -> per-item `register_exe_item_on_conn` ([ExeFolderWatchWidget.svelte:225](/E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:225), [items.ts:141](/E:/Cella/Projects/arcagate/src/lib/ipc/items.ts:141), [item_commands.rs:235](/E:/Cella/Projects/arcagate/src-tauri/src/commands/item_commands.rs:235), [item_service.rs:601](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:601)).\
  Items/refs: same semantics as single exe register.\
  Transaction: whole bulk is transactional ([item_service.rs:611](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:611)).

- `[import-json-items]` trigger: import command / call-chain: `cmd_import_json` -> `export_service::import_json` -> SQL `INSERT OR REPLACE INTO items` ([export_commands.rs:16](/E:/Cella/Projects/arcagate/src-tauri/src/commands/export_commands.rs:16), [export_service.rs:52](/E:/Cella/Projects/arcagate/src-tauri/src/services/export_service.rs:52), [export_service.rs:91](/E:/Cella/Projects/arcagate/src-tauri/src/services/export_service.rs:91)).\
  Items: direct SQL upsert-like insert.\
  Refs: imported tag rows handled separately in same import transaction ([export_service.rs:116](/E:/Cella/Projects/arcagate/src-tauri/src/services/export_service.rs:116)).\
  Note: import SQL does not include `source_widget_id/source_entry_key` columns.

---

**2) DELETION patterns (rows removed from `items`)**

- `[delete-item-single]` trigger: Library card/detail/context delete and widget context delete / call-chain: UI -> `itemStore.deleteItem` -> IPC `deleteItem` -> `cmd_delete_item` -> `ItemService::delete_item` -> `item_repository::delete` ([LibraryDetailPanel.svelte:130](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryDetailPanel.svelte:130), [LibraryView.svelte:317](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:317), [WidgetItemContextMenu.svelte:186](/E:/Cella/Projects/arcagate/src/lib/widgets/_shared/WidgetItemContextMenu.svelte:186), [items.svelte.ts:128](/E:/Cella/Projects/arcagate/src/lib/state/items.svelte.ts:128), [item_service.rs:171](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:171), [item_repository.rs:181](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/item_repository.rs:181)).\
  Items: deletes one row in transaction.\
  Refs: records hide if source-backlink exists ([item_service.rs:176](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:176)); removes `item_id/item_ids` refs from all widget configs ([item_service.rs:186](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:186), [workspace_repository.rs:236](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/workspace_repository.rs:236)); `item_tags` cascade by FK ([001_initial.sql:57](/E:/Cella/Projects/arcagate/src-tauri/migrations/001_initial.sql:57)).

- `[delete-items-bulk]` trigger: library bulk delete / call-chain: `bulkDeleteItems` -> `cmd_bulk_delete_items` -> `ItemService::bulk_delete_items` -> SQL `DELETE FROM items` loop ([LibraryMainArea.svelte:133](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryMainArea.svelte:133), [items.ts:155](/E:/Cella/Projects/arcagate/src/lib/ipc/items.ts:155), [item_commands.rs:80](/E:/Cella/Projects/arcagate/src-tauri/src/commands/item_commands.rs:80), [item_service.rs:317](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:317), [item_service.rs:332](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:332)).\
  Items: hard delete each id in one transaction.\
  Refs: no hide recording; no widget-config cascade removal here.

- `[delete-workspace-with-delete_items]` trigger: workspace/page/tab delete dialog with checkbox / call-chain: `workspaceStore.deleteWorkspace(..., deleteItems)` -> `cmd_delete_workspace` -> `WorkspaceService::delete_workspace` ([WorkspaceDeleteConfirmDialog.svelte:45](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/workspace/WorkspaceDeleteConfirmDialog.svelte:45), [workspace-config.svelte.ts:101](/E:/Cella/Projects/arcagate/src/lib/state/workspace-config.svelte.ts:101), [workspace_commands.rs:43](/E:/Cella/Projects/arcagate/src-tauri/src/commands/workspace_commands.rs:43), [workspace_service.rs:81](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:81)).\
  Items: gathers workspace-referenced ids (tags + widget config refs), deletes only those not referenced elsewhere ([workspace_service.rs:104](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:104), [workspace_repository.rs:308](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/workspace_repository.rs:308)).\
  Refs: cascade-remove widget config refs before delete ([workspace_service.rs:110](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:110)).

- `[delete-tracked-items-on-watched-path-remove]` trigger: `remove_watched_path` IPC (called when widget removed and no same path widget left in active workspace state) / call-chain: frontend removeWidget/removeMany -> `removeWatchedPath` -> `cmd_remove_watched_path` -> `WatchedPathService::remove_watched_path` ([workspace-widgets.svelte.ts:65](/E:/Cella/Projects/arcagate/src/lib/state/workspace-widgets.svelte.ts:65), [workspace-widgets.svelte.ts:389](/E:/Cella/Projects/arcagate/src/lib/state/workspace-widgets.svelte.ts:389), [watched_paths.ts:5](/E:/Cella/Projects/arcagate/src/lib/ipc/watched_paths.ts:5), [watched_path_commands.rs:27](/E:/Cella/Projects/arcagate/src-tauri/src/commands/watched_path_commands.rs:27), [watched_path_service.rs:62](/E:/Cella/Projects/arcagate/src-tauri/src/services/watched_path_service.rs:62)).\
  Items: deletes tracked items under path via `find_tracked_ids_under_path` then `item_repository::delete` ([item_repository.rs:286](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/item_repository.rs:286), [watched_path_service.rs:66](/E:/Cella/Projects/arcagate/src-tauri/src/services/watched_path_service.rs:66), [watched_path_service.rs:71](/E:/Cella/Projects/arcagate/src-tauri/src/services/watched_path_service.rs:71)).\
  Refs: does widget-config cascade removal first ([watched_path_service.rs:68](/E:/Cella/Projects/arcagate/src-tauri/src/services/watched_path_service.rs:68)); no hide recording.

- `[factory-reset-library]` trigger: reset dialog / call-chain: `factoryReset` -> `cmd_factory_reset` -> `reset_service::factory_reset` ([CleanResetDialog.svelte:56](/E:/Cella/Projects/arcagate/src/lib/components/settings/CleanResetDialog.svelte:56), [config.ts:47](/E:/Cella/Projects/arcagate/src/lib/ipc/config.ts:47), [config_commands.rs:43](/E:/Cella/Projects/arcagate/src-tauri/src/commands/config_commands.rs:43), [reset_service.rs:23](/E:/Cella/Projects/arcagate/src-tauri/src/services/reset_service.rs:23)).\
  Items: `DELETE FROM items` when `reset_library=true` ([reset_service.rs:26](/E:/Cella/Projects/arcagate/src-tauri/src/services/reset_service.rs:26)).\
  Refs: tag/hide/widget rows may be separately deleted by reset flags and/or FKs.

- `[other direct DELETE FROM items]` raw SQL locations: [item_repository.rs:182](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/item_repository.rs:182), [item_service.rs:332](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:332), [workspace_service.rs:113](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:113), [reset_service.rs:26](/E:/Cella/Projects/arcagate/src-tauri/src/services/reset_service.rs:26).

---

**3) RETENTION / ORPHAN patterns**

- `[manual-library-only-item]` manual item can survive with no workspace refs; row remains in Library unless explicitly deleted ([item_service.rs:52](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:52), [item_service.rs:54](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:54)).

- `[source-widget-deleted-backlink-null]` deleting widget does not delete item; FK sets `source_widget_id=NULL` (`ON DELETE SET NULL`) ([039_items_source_back_link.sql:22](/E:/Cella/Projects/arcagate/src-tauri/migrations/039_items_source_back_link.sql:22), [workspace_service.rs:180](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:180)).

- `[widget-config-reference-without-sys-ws-tag]` item can be referenced in widget `item_id/item_ids` with no workspace tag (picker writes config only); workspace deletion logic still treats widget-config refs as ownership signals ([LibraryItemPicker.svelte:39](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/workspace/LibraryItemPicker.svelte:39), [workspace_repository.rs:58](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/workspace_repository.rs:58), [workspace_service.rs:104](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:104)).

- `[multi-workspace-item]` item with multiple `sys-ws-*` tags or config refs is retained when one workspace is deleted because `is_item_referenced_outside_workspace` checks other refs ([workspace_repository.rs:308](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/workspace_repository.rs:308), [workspace_repository.rs:337](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/workspace_repository.rs:337)).

- `[is_tracked-true-path-removed]` watched path removal deletes tracked rows under path ([watched_path_service.rs:66](/E:/Cella/Projects/arcagate/src-tauri/src/services/watched_path_service.rs:66), [item_repository.rs:286](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/item_repository.rs:286)).

- `[target-file-disappeared]` FS remove event does not delete row; emits event only ([watcher/mod.rs:101](/E:/Cella/Projects/arcagate/src-tauri/src/watcher/mod.rs:101), [watcher_service.rs:41](/E:/Cella/Projects/arcagate/src-tauri/src/services/watcher_service.rs:41)).

- `[monitored-item-user-delete-hide-prevents-revive]` single delete records hide; later auto-register paths skip hidden entry ([item_service.rs:176](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:176), [item_service.rs:394](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:394), [item_service.rs:524](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:524)).

- `[partial-reference-removal]` removing one widget reference keeps item if other tags/config refs remain; delete-workspace checks outside refs before deleting ([workspace_repository.rs:308](/E:/Cella/Projects/arcagate/src-tauri/src/repositories/workspace_repository.rs:308)).

- `[remove-from-workspace-vs-library-delete]` no dedicated “remove from workspace only” backend item command found; deletion paths remove row, while workspace association is via tags/config and not a first-class detach operation.

---

**4) SETTINGS CHANGE patterns affecting items**

- `[projects-watched_folder-change]` change triggers reset and re-auto-registration ([ProjectsWidget.svelte:187](/E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:187), [ProjectsWidget.svelte:211](/E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:211)).

- `[exe-watch_path-change]` change triggers watcher rebind + rescan + bulk register ([ExeFolderWatchWidget.svelte:151](/E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:151), [ExeFolderWatchWidget.svelte:225](/E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:225)).

- `[exe-extensions-or-scan_depth-change]` same reset+rescan path, affecting which items are (re)registered ([ExeFolderSettings.svelte:62](/E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderSettings.svelte:62), [ExeFolderSettings.svelte:106](/E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderSettings.svelte:106), [ExeFolderWatchWidget.svelte:194](/E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:194)).

- `[settings-that-do-not-affect-items]` Projects `description` and similar display fields do not enter registration/deletion call chains (UI-only config).

---

**5) WATCHER / FILESYSTEM EVENT patterns**

- `[watcher-create]` emits create event only; item insertion is not done by watcher backend ([watcher/mod.rs:84](/E:/Cella/Projects/arcagate/src-tauri/src/watcher/mod.rs:84)).

- `[watcher-modify-rename]` on rename/path move, updates `items.target` for tracked rows, then emits modified event ([watcher/mod.rs:89](/E:/Cella/Projects/arcagate/src-tauri/src/watcher/mod.rs:89), [watcher_service.rs:29](/E:/Cella/Projects/arcagate/src-tauri/src/services/watcher_service.rs:29)).

- `[watcher-remove]` emits `item://path-not-found`; no delete/soft-delete/mark field change ([watcher/mod.rs:101](/E:/Cella/Projects/arcagate/src-tauri/src/watcher/mod.rs:101), [watcher_service.rs:41](/E:/Cella/Projects/arcagate/src-tauri/src/services/watcher_service.rs:41)).

- `[is_tracked-semantics]` watcher update/remove handlers gate on tracked lookup (`find_item_by_target(..., true)`) ([watcher_service.rs:20](/E:/Cella/Projects/arcagate/src-tauri/src/services/watcher_service.rs:20), [watcher_service.rs:42](/E:/Cella/Projects/arcagate/src-tauri/src/services/watcher_service.rs:42)).

---

**POTENTIAL BUG LIST**

1. `bulk_delete_items` skips hide recording and widget-config cascade cleanup; likely violates “no orphan widget item_ids” and “monitored delete should hide to prevent revive” ([item_service.rs:317](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:317), [item_service.rs:332](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs:332)).
2. Workspace delete with `delete_items=true` can delete manual items if they are only referenced by that workspace; conflicts with “manual items must never be auto-cascade deleted” ([workspace_service.rs:104](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:104), [workspace_service.rs:113](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:113)).
3. Widget delete does not delete auto-owned items; FK nulls source pointer, leaving orphaned auto items; conflicts with your stated auto-item principle ([workspace_service.rs:180](/E:/Cella/Projects/arcagate/src-tauri/src/services/workspace_service.rs:180), [039_items_source_back_link.sql:22](/E:/Cella/Projects/arcagate/src-tauri/migrations/039_items_source_back_link.sql:22)).
4. FS remove only emits event; no row state transition, enabling ghost/path-not-found items until manual action ([watcher/mod.rs:101](/E:/Cella/Projects/arcagate/src-tauri/src/watcher/mod.rs:101)).
5. Watched path config changes add new watchers but old watched_paths cleanup is tied to widget removal path, not explicit path-switch reconciliation; can leave stale tracked-delete scope behavior ([ProjectsWidget.svelte:211](/E:/Cella/Projects/arcagate/src/lib/widgets/projects/ProjectsWidget.svelte:211), [ExeFolderWatchWidget.svelte:151](/E:/Cella/Projects/arcagate/src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:151), [workspace-widgets.svelte.ts:65](/E:/Cella/Projects/arcagate/src/lib/state/workspace-widgets.svelte.ts:65)).
