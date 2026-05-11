# フロント/バックエンド処理分類表 + IPC 境界

作成日: 2026-04-25 / batch-59 PH-251

## 機能・処理の分類表

| 機能                | 実行場所   | 頻度 | 処理重さ | 移譲候補 | 根拠                        |
| ------------------- | ---------- | ---- | -------- | -------- | --------------------------- |
| アイテム起動        | Rust       | 低   | 中       | 現状維持 | OS コマンド実行は Rust 必須 |
| ファイル watch      | Rust       | 常時 | 高       | 現状維持 | OS ネイティブ通知が必要     |
| テーマ CSS 変数適用 | フロント   | 低   | 低       | 不要     | DOM 操作はフロント最適      |
| 検索フィルタ        | Rust (SQL) | 高   | 中       | 現状維持 | SQL インデックスが有効      |
| タグ統計集計        | Rust (SQL) | 低   | 中       | 現状維持 | GROUP BY は DB 側が効率的   |
| ドラッグ＆ドロップ  | フロント   | 中   | 低       | 不要     | UI イベント処理はフロント   |
| アイコン抽出        | Rust       | 低   | 高       | 現状維持 | Windows API / exe パース    |
| 起動履歴記録        | Rust (SQL) | 低   | 低       | 現状維持 | 永続化は DB 側              |
| ワークスペース集計  | Rust (SQL) | 低   | 低       | 現状維持 | SQL クエリ済み              |
| Git ステータス      | Rust       | 低   | 中       | 現状維持 | CLI 実行は Rust が安全      |
| テーマ変換・編集    | フロント   | 低   | 低       | 不要     | CSS var パースはフロント    |

## IPC コマンド全列挙（58 コマンド）

### config_commands.rs (8)

| コマンド                  | フロント側関数      |
| ------------------------- | ------------------- |
| `cmd_get_config`          | `getConfig`         |
| `cmd_set_config`          | `setConfig`         |
| `cmd_get_hotkey`          | `getHotkey`         |
| `cmd_set_hotkey`          | `setHotkey`         |
| `cmd_get_autostart`       | `getAutostart`      |
| `cmd_set_autostart`       | `setAutostart`      |
| `cmd_is_setup_complete`   | `isSetupComplete`   |
| `cmd_mark_setup_complete` | `markSetupComplete` |

### item_commands.rs (18)

`cmd_create_item`, `cmd_list_items`, `cmd_search_items`, `cmd_search_items_in_tag`, `cmd_update_item`, `cmd_delete_item`, `cmd_toggle_star`, `cmd_count_hidden_items`, `cmd_get_library_stats`, `cmd_get_tags`, `cmd_get_tag_counts`, `cmd_get_item_tags`, `cmd_create_tag`, `cmd_update_tag`, `cmd_update_tag_prefix`, `cmd_delete_tag`, `cmd_auto_register_folder_items`, `cmd_extract_item_icon`

### launch_commands.rs (4)

`cmd_launch_item`, `cmd_get_item_stats`, `cmd_list_recent`, `cmd_list_frequent`

### theme_commands.rs (9)

`cmd_list_themes`, `cmd_get_theme`, `cmd_create_theme`, `cmd_update_theme`, `cmd_delete_theme`, `cmd_get_active_theme_mode`, `cmd_set_active_theme_mode`, `cmd_export_theme_json`, `cmd_import_theme_json`

### workspace_commands.rs (13)

`cmd_create_workspace`, `cmd_list_workspaces`, `cmd_update_workspace`, `cmd_delete_workspace`, `cmd_add_widget`, `cmd_list_widgets`, `cmd_update_widget_position`, `cmd_update_widget_config`, `cmd_remove_widget`, `cmd_get_frequent_items`, `cmd_get_recent_items`, `cmd_get_folder_items`, `cmd_git_status`

### watched_path_commands.rs (3)

`cmd_add_watched_path`, `cmd_get_watched_paths`, `cmd_remove_watched_path`

### export_commands.rs (2)

`cmd_export_json`, `cmd_import_json`

## IPC 境界の状態

- **型定義同期**: Rust の `Result<T, AppError>` → Tauri 自動シリアライズ → TS は `string` エラーとして受信
- **invoke 関数**: `src/lib/ipc/` に 7 モジュール、合計 61 invoke 呼び出し（コマンドによっては複数箇所から呼ばれる）
- **Tauri Event**: `theme-changed`（batch-58 PH-246 で追加）

## Rust 移譲候補

現状の分析では **移譲候補なし**。フロント/バックエンド分担は適切。

将来候補（将来的に要重量化した場合）:

- 検索結果のソート・フィルタ: 現状 SQL で十分だが、全文検索強化時は SQLite FTS5 拡張を検討
- アイコン抽出の非同期化: 現在同期 IPC。大量起動時にブロッキングになる可能性
