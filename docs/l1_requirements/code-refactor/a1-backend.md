# A1 Backend Audit (`src-tauri/src/`)

調査時点: 2026-05-06、main 最新 `f035a40`。

## 1. `src-tauri/src/` 全体地図

| subdir          |  files |        LOC | 役割                           |
| --------------- | -----: | ---------: | ------------------------------ |
| `commands/`     |     14 |        739 | Tauri IPC エントリーポイント   |
| `services/`     |     18 |      4,358 | business logic                 |
| `repositories/` |     11 |      2,987 | DB 層 (rusqlite + 生 SQL)      |
| `models/`       |     10 |        658 | domain struct / enum (serde)   |
| `db/`           |      2 |        137 | connection + migrations 管理   |
| `utils/`        |      5 |        402 | error / icon / git / http 補助 |
| `watcher/`      |      2 |        129 | file system 監視               |
| `plugin_api/`   |      4 |          — | plugin provider API            |
| `launcher/`     |      1 |          — | application launcher helper    |
| `bin/`          |      1 |          — | CLI binary `arcagate_cli`      |
| **合計**        | **70** | **11,462** |                                |

## 2. commands/ 詳細

| file                         | commands | LOC | 範囲                                                         |
| ---------------------------- | -------: | --: | ------------------------------------------------------------ |
| `item_commands.rs`           |       25 | 188 | item CRUD / tags / bulk / search                             |
| `workspace_commands.rs`      |       16 | 144 | workspace CRUD / widgets / wallpaper / frecency              |
| `config_commands.rs`         |       15 | 101 | config / hotkey / autostart / setup / onboarding / telemetry |
| `theme_commands.rs`          |        9 |  83 | theme CRUD / import-export / active mode                     |
| `opener_commands.rs`         |        4 |  34 | opener mgmt + launch                                         |
| `launch_commands.rs`         |        4 |  32 | launch / recent / frequent                                   |
| `watched_path_commands.rs`   |        3 |  35 | watched path                                                 |
| `file_search_commands.rs`    |        3 |  37 | file search + cancellation                                   |
| `system_monitor_commands.rs` |        3 |  18 | system / disk / network stats                                |
| `metadata_commands.rs`       |        2 |  21 | item metadata batch                                          |
| `export_commands.rs`         |        2 |  15 | JSON export/import                                           |
| `exe_scanner_commands.rs`    |        1 |   7 | EXE folder scan                                              |
| `kill_switch_commands.rs`    |        1 |  10 | kill switch                                                  |
| `mod.rs`                     |        — |   — | module 宣言                                                  |

- 命名: `cmd_*` prefix で **88 commands 全件統一** (例外なし)
- async / sync 比率: async 1 / sync 87 (97.7% sync) — async は file_search 系のみ

## 3. services/ 詳細

`item_service` (14 fn) / `workspace_service` (9) / `theme_service` (7) / `opener_service` (6) / `config_service` (5) / `metadata_service` (2) / `launch_service` (2) / `export_service` (2) / `watched_path_service` (3) / `system_monitor_service` (3) / `file_search_service` (1) / `wallpaper_service` (1) / `crash_monitor_service` (1) / `exe_scanner_service` (2) / `kill_switch_service` (1) / `telemetry_service` / `file_search_state` (cancel token state) / `icon_cache_repository` (※ 名は repository だが services/ 配下、注: 配置ミス疑い) など。

総 public function 数: **95**。

### service 間 cross-reference

- `launch_service` → `opener_service` (1 件、許容範囲)
- 他 service 間の相互参照は **検出されず**

## 4. repositories/ 詳細

| file                                 | public fn |
| ------------------------------------ | --------: |
| `item_repository.rs`                 |        15 |
| `workspace_repository.rs`            |        11 |
| `theme_repository.rs`                |         8 |
| `icon_cache_repository.rs`           |         8 |
| `tag_repository.rs`                  |         7 |
| `launch_repository.rs`               |         6 |
| `opener_repository.rs`               |         5 |
| `config_repository.rs`               |         4 |
| `widget_item_settings_repository.rs` |         4 |
| `watched_path_repository.rs`         |         3 |

総 public function 数: **75**。

DB 接続パターン (代表 `item_repository`):

```rust
pub fn insert(conn: &Connection, item: &Item) -> Result<(), AppError> {
    let conn_guard = conn.lock().map_err(|_| AppError::DbLock)?;
    conn_guard.execute("INSERT INTO ...", ...)?;
    Ok(())
}
```

- ✓ `Mutex<Connection>` thread-safe
- ✓ transaction は service 層で取り回し

## 5. models/ 詳細

10 file、27 struct/enum 定義。serde 直接属性 (`#[serde(...)]`) は 6 occurrences のみ (大部分は `derive(Serialize, Deserialize)`)。

主要 struct: `item.rs` (5 struct) / `workspace.rs` (5) / `tag.rs` (3) / `theme.rs` (3) / `opener.rs` (2) / `config.rs` (1) / `watched_path.rs` (2) / `launch.rs` (2) / `git.rs` (1)。

`AppError` は **`utils/error.rs`** に定義 (15 variants、`impl Serialize` で `{ code, message }` 形式、`code()` method で PH-422/PH-429 対応)。

## 6. db/ 詳細

- `db/mod.rs` (24 LOC) — `DbState(Mutex<Connection>)` 定義 + `initialize()`
- `db/migrations.rs` (137 LOC) — refinery 経由
- migration SQL: `src-tauri/migrations/` に **22 file** (`001_initial.sql` 〜 `022_icon_cache.sql`)
- pragma 設定: WAL mode + その他は `apply_pragmas()` 内

## 7. utils/ 詳細

| file             | LOC | 内容                                       |
| ---------------- | --: | ------------------------------------------ |
| `error.rs`       | 118 | `AppError` enum + Serialize impl           |
| `icon.rs`        | 167 | icon extraction (FS read 含む side effect) |
| `http_client.rs` |  66 | HTTP client wrapper                        |
| `git.rs`         |  29 | `git status` subprocess                    |
| `mod.rs`         |  22 | module 宣言                                |

domain logic 混入: 検出されず (純粋な infra helper)。

## 8. IPC commands 全 list (88 件)

```
# items (25)
cmd_create_item / cmd_list_items / cmd_search_items / cmd_search_items_in_tag /
cmd_update_item / cmd_delete_item / cmd_count_item_references / cmd_bulk_add_tag /
cmd_bulk_remove_tag / cmd_bulk_delete_items / cmd_get_tags / cmd_create_tag /
cmd_update_tag / cmd_update_tag_prefix / cmd_delete_tag / cmd_get_tag_counts /
cmd_get_item_tags / cmd_check_is_directory / cmd_extract_item_icon /
cmd_toggle_star / cmd_get_library_stats / cmd_count_hidden_items /
cmd_register_exe_item / cmd_register_exe_items_bulk / cmd_auto_register_folder_items

# workspace (16)
cmd_create_workspace / cmd_list_workspaces / cmd_update_workspace / cmd_delete_workspace /
cmd_add_widget / cmd_list_widgets / cmd_update_widget_position / cmd_update_widget_config /
cmd_remove_widget / cmd_get_frequent_items / cmd_get_recent_items / cmd_get_frecency_items /
cmd_get_folder_items / cmd_save_wallpaper_file / cmd_set_workspace_wallpaper /
cmd_get_item_stats

# config / setup (15)
cmd_get_config / cmd_set_config / cmd_get_hotkey / cmd_set_hotkey /
cmd_get_autostart / cmd_set_autostart / cmd_is_setup_complete / cmd_mark_setup_complete /
cmd_is_onboarding_complete / cmd_mark_onboarding_complete / cmd_get_telemetry_opt_in /
cmd_set_telemetry_opt_in / cmd_get_crash_report_opt_in / cmd_set_crash_report_opt_in /
cmd_consume_last_panic

# theme (9)
cmd_list_themes / cmd_get_theme / cmd_create_theme / cmd_update_theme / cmd_delete_theme /
cmd_get_active_theme_mode / cmd_set_active_theme_mode / cmd_export_theme_json /
cmd_import_theme_json

# launch / opener (8)
cmd_launch_item / cmd_list_recent / cmd_list_frequent /
cmd_list_openers / cmd_save_opener / cmd_delete_opener / cmd_launch_with_opener / cmd_open_path

# search / scan (4)
cmd_scan_exe_folders / cmd_list_files / cmd_cancel_file_search / cmd_check_kill_switch

# misc (11)
cmd_export_json / cmd_import_json / cmd_get_item_metadata / cmd_get_items_metadata_batch /
cmd_add_watched_path / cmd_get_watched_paths / cmd_remove_watched_path /
cmd_git_status / cmd_get_system_stats / cmd_get_disk_stats / cmd_get_network_stats
```

handler! 登録: 88/88 (漏れなし)。

## 9. lib.rs 構造

plugin 一覧 (8): `tauri_plugin_global_shortcut` / `_autostart` / `_dialog` / `_fs` / `_shell` / `_clipboard_manager` / `_updater` / `_log` (file rotation)。

setup フック: DB 初期化 → panic hook install → system tags 初期化 → file watcher 起動 → file search cancel state 管理 → global shortcut 登録 (hotkey from DB)。

window event: `CloseRequested` → minimize to tray、palette window `Focused(false)` → auto-hide。

## 10. 死コード sniff

| marker                             | count |
| ---------------------------------- | ----: |
| `// TODO` / `// FIXME` / `// HACK` |     0 |
| `#[allow(dead_code)]`              |    15 |
| `#[deprecated]`                    |     0 |

`#[allow(dead_code)]` の主な所在: `plugin_api/mod.rs` (module marker)、`db/mod.rs` (DbState)、ほか test utilities / feature-gated code。

## まとめ

backend の構造は概ね良好で、特に IPC 命名 (88/88 `cmd_*` 統一)、handler! 登録漏れなし、AppError 一貫性、migration sequential 維持、ORM 不使用方針堅持は強み。

主な refactor 課題は:

- **commands → DbState 直接依存** (9 file、layer-leak)
- **repository 相互参照** (3 件)
- **watcher → repositories 直接依存** (service skip)
- **services/icon_cache_repository.rs**: 命名・配置のレイヤー混乱の疑い

詳細は `a1-violations.md` 参照。
