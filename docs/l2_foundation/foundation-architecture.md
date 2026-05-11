# Foundation: アーキテクチャ詳細

Service Layer 設計 / Plugin Interface / Tauri IPC / State 管理 / rusqlite / エラーハンドリング。

---

## Service Layer 設計

Service Layer は Arcagate の中核。全エントリーポイント（UI, CLI）がここを経由する。

```
UI (Tauri commands)  ─┐
CLI (将来)           ─┴─→  Service Layer  →  Repository Layer  →  SQLite
```

### Service traits

```rust
pub trait ItemService: Send + Sync {
    fn create_item(&self, input: CreateItemInput) -> Result<Item>;
    fn update_item(&self, id: ItemId, input: UpdateItemInput) -> Result<Item>;
    fn delete_item(&self, id: ItemId) -> Result<()>;
    fn get_item(&self, id: ItemId) -> Result<Option<Item>>;
    fn search_items(&self, query: &str, opts: SearchOptions) -> Result<Vec<ItemSearchResult>>;
}

pub trait LaunchService: Send + Sync {
    fn launch_item(&self, id: ItemId) -> Result<LaunchResult>;
    // 内部で ItemService（対象取得）+ LogService（記録）+ item_stats 更新 を統合
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

---

## Plugin Interface（trait 定義のみ）

プラグインローディングは未実装。trait 境界のみ定義し、将来移行時のリファクタを防止。

```rust
pub trait ItemProvider: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn provide_items(&self) -> Result<Vec<ProvidedItem>>;
    fn on_item_launch(&self, item: &Item) -> Result<LaunchAction>;
}

pub trait CommandProvider: Send + Sync {
    fn id(&self) -> &str;
    fn commands(&self) -> Vec<CommandDefinition>;
    fn execute(&self, command_id: &str, args: &[String]) -> Result<CommandResult>;
}

pub trait Plugin: Send + Sync {
    fn manifest(&self) -> PluginManifest;
    fn initialize(&mut self, ctx: PluginContext) -> Result<()>;
    fn shutdown(&mut self) -> Result<()>;
}
```

---

## Tauri IPC 設計

### Commands（Frontend → Backend）

論理名は `namespace::action` 形式。Tauri v2 の `#[tauri::command]` では関数名が invoke 名（アンダースコア区切り）になる。

| 論理名                    | invoke 名                    | 引数                                  | 戻り値             |
| ------------------------- | ---------------------------- | ------------------------------------- | ------------------ |
| `item::create`            | `cmd_create_item`            | CreateItemInput                       | Item               |
| `item::list`              | `cmd_list_items`             | -                                     | Item[]             |
| `item::search`            | `cmd_search_items`           | query, SearchOptions                  | ItemSearchResult[] |
| `item::update`            | `cmd_update_item`            | id, UpdateItemInput                   | Item               |
| `item::delete`            | `cmd_delete_item`            | id                                    | ()                 |
| `item::launch`            | `cmd_launch_item`            | item_id                               | ()                 |
| `item::import_icon`       | `cmd_extract_item_icon`      | exe_path                              | string (icon_path) |
| `tag::list`               | `cmd_get_tags`               | -                                     | Tag[]              |
| `tag::create`             | `cmd_create_tag`             | CreateTagInput                        | Tag                |
| `tag::update`             | `cmd_update_tag`             | id, UpdateTagInput                    | Tag                |
| `tag::delete`             | `cmd_delete_tag`             | id                                    | ()                 |
| `log::recent`             | `cmd_list_recent`            | limit?                                | LaunchLog[]        |
| `log::frequent`           | `cmd_list_frequent`          | limit?                                | LaunchLog[]        |
| `config::get`             | `cmd_get_config`             | key                                   | string \| null     |
| `config::set`             | `cmd_set_config`             | key, value                            | ()                 |
| `data::export`            | `cmd_export_json`            | output_path                           | ()                 |
| `data::import`            | `cmd_import_json`            | input_path                            | ()                 |
| `watched_path::add`       | `cmd_add_watched_path`       | path, label?                          | WatchedPath        |
| `watched_path::list`      | `cmd_get_watched_paths`      | -                                     | WatchedPath[]      |
| `watched_path::remove`    | `cmd_remove_watched_path`    | id                                    | ()                 |
| `workspace::create`       | `cmd_create_workspace`       | name                                  | Workspace          |
| `workspace::list`         | `cmd_list_workspaces`        | -                                     | Workspace[]        |
| `workspace::update`       | `cmd_update_workspace`       | id, name                              | Workspace          |
| `workspace::delete`       | `cmd_delete_workspace`       | id                                    | ()                 |
| `widget::add`             | `cmd_add_widget`             | workspace_id, widget_type, x, y, w, h | WorkspaceWidget    |
| `widget::list`            | `cmd_list_widgets`           | workspace_id                          | WorkspaceWidget[]  |
| `widget::update_position` | `cmd_update_widget_position` | id, x, y, width, height               | WorkspaceWidget    |
| `widget::update_config`   | `cmd_update_widget_config`   | id, config                            | WorkspaceWidget    |
| `widget::remove`          | `cmd_remove_widget`          | id                                    | ()                 |
| `theme::list`             | `cmd_list_themes`            | -                                     | Theme[]            |
| `theme::create`           | `cmd_create_theme`           | name, base_theme, css_vars            | Theme              |
| `theme::update`           | `cmd_update_theme`           | id, ...                               | Theme              |
| `theme::delete`           | `cmd_delete_theme`           | id                                    | ()                 |
| `theme::get_active_mode`  | `cmd_get_active_theme_mode`  | -                                     | string             |
| `theme::set_active_mode`  | `cmd_set_active_theme_mode`  | mode                                  | ()                 |
| `theme::export`           | `cmd_export_theme_json`      | id                                    | string (JSON)      |
| `theme::import`           | `cmd_import_theme_json`      | json                                  | Theme              |

### Events（Backend → Frontend）

| イベント           | ペイロード         | 用途                     |
| ------------------ | ------------------ | ------------------------ |
| `hotkey-triggered` | -                  | グローバルホットキー押下 |
| `item-launched`    | item_id, timestamp | 起動通知                 |
| `tray-action`      | action             | トレイメニュー操作       |
| `theme-changed`    | theme_id           | テーマ変更通知           |

### Frontend IPC ラッパー

```typescript
// src/lib/ipc/items.ts — invoke を直接呼ばず型付きラッパーを使用
import { invoke } from '@tauri-apps/api/core';

export async function createItem(input: CreateItemInput): Promise<Item> {
  return invoke('cmd_create_item', { input });
}
export async function searchItems(query: string): Promise<ItemSearchResult[]> {
  return invoke('cmd_search_items', { query });
}
```

---

## State 管理

Svelte 5 runes をクラスベースで使用。外部状態管理ライブラリ不要。

```typescript
// src/lib/state/palette.svelte.ts
class PaletteState {
  query = $state('');
  results = $state<ItemSearchResult[]>([]);
  selectedIndex = $state(0);
  isVisible = $state(false);

  selectedItem = $derived(this.results[this.selectedIndex] ?? null);

  async search(query: string) { /* ... */ }
  toggle() { /* ... */ }
}

export const paletteState = new PaletteState();
```

パターン: クラスの `$state` フィールド + `$derived` ゲッター。シングルトンインスタンスをエクスポート。

---

## rusqlite Connection 管理

`rusqlite::Connection` は `Send` だが `Sync` ではないため、`Mutex<Connection>` で保持。

```rust
pub struct DbState(pub Mutex<rusqlite::Connection>);

// lib.rs での登録
app.manage(DbState(Mutex::new(connection)));

// Command ハンドラでの使用
#[tauri::command]
fn cmd_search_items(db: State<DbState>, query: String) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    // ...
}
```

1 ユーザー・数百件以下のアイテム数では `Mutex<Connection>` で十分。`launch_item` はアイテム取得→ログ記録→統計更新を単一 SQLite トランザクションで実行（プロセス起動自体はトランザクション外）。

---

## エラーハンドリング

### エラー型

```rust
// src-tauri/src/utils/error.rs
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Item not found: {0}")]
    NotFound(String),
    #[error("Launch failed: {0}")]
    LaunchFailed(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Database lock error")]
    DbLock,
}

// { code, message } 構造で frontend に serialize
impl serde::Serialize for AppError { /* ... */ }
```

### エラー伝播パターン

```
Repository (rusqlite::Error) → Service (AppError) → Command (Result<T, AppError>) → Frontend
```

- Repository: `rusqlite::Error` を `AppError::Database` に自動変換
- Service: ビジネスロジック固有のエラー（NotFound, Validation）を生成
- Command: `Result<T, AppError>` をそのまま返す
- Frontend: IPC ラッパーで `catch`、トースト通知で表示

---

## パスワード可視性トグル

カジュアルな隠蔽用途（暗号学的保護ではない）。

- パスワードは `argon2` でハッシュ化し `config` テーブルに保存
- セッション中はメモリ上のフラグでトグル状態を管理
- 試行回数制限なし（個人用途）
- パスワード未設定の場合はホットキーのみでトグル可能
