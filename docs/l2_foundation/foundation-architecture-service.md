# Foundation §2.3-2.5: Service Layer / Plugin Interface / Tauri IPC

[foundation.md](./foundation.md) §2 のうち §2.3-2.5。

### 2.3 Service Layer 設計

Service LayerはArcagateの中核。全エントリーポイント（UI, CLI）がここを経由する。

```
UI (Tauri commands)  ─┐
CLI (M2a)            ─┴─→  Service Layer  →  Repository Layer  →  SQLite
```

#### Service traits（プラグイン境界）

```rust
// M1: trait定義 + CoreXxxService として具体実装
// M2+: プラグインが同じtraitを実装可能

pub trait ItemService: Send + Sync {
    fn create_item(&self, input: CreateItemInput) -> Result<Item>;
    fn update_item(&self, id: ItemId, input: UpdateItemInput) -> Result<Item>;
    fn delete_item(&self, id: ItemId) -> Result<()>;
    fn get_item(&self, id: ItemId) -> Result<Option<Item>>;
    fn search_items(&self, query: &str, opts: SearchOptions) -> Result<Vec<ItemSearchResult>>;
}

pub trait LaunchService: Send + Sync {
    fn launch_item(&self, id: ItemId) -> Result<LaunchResult>;
    // 内部で ItemService（対象取得）+ LogService（記録）+ item_stats更新 を統合
}

pub trait LogService: Send + Sync {
    fn record_launch(&self, item_id: ItemId) -> Result<()>;
    fn get_recent(&self, limit: usize) -> Result<Vec<LaunchLogEntry>>;
    fn get_frequent(&self, limit: usize) -> Result<Vec<LaunchLogEntry>>;
}

pub trait ConfigService: Send + Sync {
    fn get(&self, key: &str) -> Result<Option<String>>;
    fn set(&self, key: &str, value: &str) -> Result<()>;
}
```

### 2.4 Plugin Interface（M1: trait定義のみ）

M1ではプラグインローディングは実装しない。trait境界のみ定義し、M2移行時のリファクタを防止する。

```rust
/// アイテムを提供するプラグイン
pub trait ItemProvider: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn provide_items(&self) -> Result<Vec<ProvidedItem>>;
    fn on_item_launch(&self, item: &Item) -> Result<LaunchAction>;
}

/// コマンドパレットを拡張するプラグイン
pub trait CommandProvider: Send + Sync {
    fn id(&self) -> &str;
    fn commands(&self) -> Vec<CommandDefinition>;
    fn execute(&self, command_id: &str, args: &[String]) -> Result<CommandResult>;
}

/// プラグインライフサイクル
pub trait Plugin: Send + Sync {
    fn manifest(&self) -> PluginManifest;
    fn initialize(&mut self, ctx: PluginContext) -> Result<()>;
    fn shutdown(&mut self) -> Result<()>;
}
```

### 2.5 Tauri IPC 設計

#### Commands（Frontend → Backend、request/response）

論理名は `namespace::action` 形式で設計。Tauri v2の `#[tauri::command]` では関数名がinvoke名になるため、実際のinvoke呼び出しは `namespace_action`（アンダースコア区切り）を使用する。

| 論理名                      | invoke名                     | 引数                                  | 戻り値             |
| --------------------------- | ---------------------------- | ------------------------------------- | ------------------ |
| `item::create`              | `item_create`                | CreateItemInput                       | Item               |
| `item::update`              | `item_update`                | id, UpdateItemInput                   | Item               |
| `item::delete`              | `item_delete`                | id                                    | ()                 |
| `item::get`                 | `item_get`                   | id                                    | Item \| null       |
| `item::search`              | `item_search`                | query, SearchOptions                  | ItemSearchResult[] |
| `item::launch`              | `cmd_launch_item`            | item_id                               | ()                 |
| `item::import_icon`         | `cmd_extract_item_icon`      | exe_path                              | string (icon_path) |
| `tag::list`                 | `cmd_get_tags`               | -                                     | Tag[]              |
| `tag::create`               | `cmd_create_tag`             | CreateTagInput                        | Tag                |
| `tag::update`               | `cmd_update_tag`             | id, UpdateTagInput                    | Tag                |
| `tag::delete`               | `cmd_delete_tag`             | id                                    | ()                 |
| `log::recent`               | `cmd_list_recent`            | limit?                                | LaunchLog[]        |
| `log::frequent`             | `cmd_list_frequent`          | limit?                                | LaunchLog[]        |
| `config::get`               | `cmd_get_config`             | key                                   | string \| null     |
| `config::set`               | `cmd_set_config`             | key, value                            | ()                 |
| `data::export`              | `cmd_export_json`            | output_path                           | ()                 |
| `data::import`              | `cmd_import_json`            | input_path                            | ()                 |
| `watched_path::add`         | `cmd_add_watched_path`       | path, label?                          | WatchedPath        |
| `watched_path::list`        | `cmd_get_watched_paths`      | -                                     | WatchedPath[]      |
| `watched_path::remove`      | `cmd_remove_watched_path`    | id                                    | ()                 |
| `workspace::create`         | `cmd_create_workspace`       | name                                  | Workspace          |
| `workspace::list`           | `cmd_list_workspaces`        | -                                     | Workspace[]        |
| `workspace::update`         | `cmd_update_workspace`       | id, name                              | Workspace          |
| `workspace::delete`         | `cmd_delete_workspace`       | id                                    | ()                 |
| `widget::add`               | `cmd_add_widget`             | workspace_id, widget_type, x, y, w, h | WorkspaceWidget    |
| `widget::list`              | `cmd_list_widgets`           | workspace_id                          | WorkspaceWidget[]  |
| `widget::update_position`   | `cmd_update_widget_position` | id, x, y, width, height               | WorkspaceWidget    |
| `widget::remove`            | `cmd_remove_widget`          | id                                    | ()                 |
| `workspace::frequent_items` | `cmd_get_frequent_items`     | limit                                 | Item[]             |
| `workspace::recent_items`   | `cmd_get_recent_items`       | limit                                 | Item[]             |
| `workspace::folder_items`   | `cmd_get_folder_items`       | -                                     | Item[]             |
| `workspace::git_status`     | `cmd_git_status`             | path                                  | GitStatus          |
| `theme::list`               | `cmd_list_themes`            | -                                     | Theme[]            |
| `theme::get`                | `cmd_get_theme`              | id                                    | Theme              |
| `theme::create`             | `cmd_create_theme`           | name, base_theme, css_vars            | Theme              |
| `theme::update`             | `cmd_update_theme`           | id, name?, base_theme?, css_vars?     | Theme              |
| `theme::delete`             | `cmd_delete_theme`           | id                                    | ()                 |
| `theme::get_active_mode`    | `cmd_get_active_theme_mode`  | -                                     | string             |
| `theme::set_active_mode`    | `cmd_set_active_theme_mode`  | mode                                  | ()                 |
| `theme::export`             | `cmd_export_theme_json`      | id                                    | string (JSON)      |
| `theme::import`             | `cmd_import_theme_json`      | json                                  | Theme              |

#### Events（Backend → Frontend、fire-and-forget）

| イベント           | ペイロード         | 用途                     |
| ------------------ | ------------------ | ------------------------ |
| `hotkey-triggered` | -                  | グローバルホットキー押下 |
| `item-launched`    | item_id, timestamp | 起動通知                 |
| `tray-action`      | action             | トレイメニュー操作       |

#### Frontend IPC ラッパー

```typescript
// src/lib/ipc/items.ts — invoke を直接呼ばず型付きラッパーを使用
// invoke名はRust側の関数名と一致（アンダースコア区切り）
import { invoke } from '@tauri-apps/api/core';
import type { Item, CreateItemInput, AppError } from '$lib/types';

export async function createItem(input: CreateItemInput): Promise<Item> {
  return invoke('item_create', { input });
}

export async function searchItems(query: string): Promise<ItemSearchResult[]> {
  return invoke('item_search', { query });
}

// エラーハンドリング: IPCラッパーで catch し、トースト通知で表示
export async function launchItem(id: string): Promise<LaunchResult> {
  return invoke('item_launch', { id });
}
```
