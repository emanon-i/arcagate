# A3 Backend Target Shape (`src-tauri/src/`)

A1 audit + A2 best practice を踏まえた、refactor 完了後の backend target shape。subdir 分離は維持し、layer 違反 (V1/V2/V3) と命名混乱 (V7) を解消する。

## 1. Subdir 構造 (現状維持 + 微調整)

```
src-tauri/src/
├── commands/        14 file (現状)、各 file は thin layer
├── services/        18 file (現状)、struct 化 + State 注入対応
├── repositories/    11 file (現状)、相互参照を撲滅
├── models/          10 file (現状)、row_to_X helper を集約
├── db/              2 file (現状維持)
├── utils/           5 file (現状維持、AppError + icon + git + http)
├── watcher/         2 file (services 経由に整理)
├── plugin_api/      4 file (現状維持)
├── launcher/        1 file (現状維持)
└── bin/             1 file (CLI binary、現状維持)
```

**変更点**:

- crate 分割は **しない** (Arcagate サイズで overhead に見合わない、A2 TR-2)
- subdir 名は現状維持 (新規 subdir 追加なし)

## 2. 命名規則 (現状 + 統一強化)

| 対象                | 現状                        | target                    | 備考                                                                                    |
| ------------------- | --------------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| Tauri command       | `cmd_*` 88/88 統一          | 維持                      | A1 で良好確認                                                                           |
| service file        | `xxx_service.rs`            | 維持                      | (例外: V7 の icon_cache_repository.rs を services/ から削除して repositories/ 側に集約) |
| repository file     | `xxx_repository.rs`         | 維持                      |                                                                                         |
| service struct      | (現状なし、module function) | `XxxService` 構造体に変更 | A2 TR-4 / 後述 §3                                                                       |
| repository function | snake_case                  | 維持                      |                                                                                         |

## 3. command + service の thin layer pattern (V1 解消)

### 3.1 service struct + DbState 内包

```rust
// services/item_service.rs (A3 target)
pub struct ItemService {
    db: Arc<DbState>,
}

impl ItemService {
    pub fn new(db: Arc<DbState>) -> Self { Self { db } }

    pub fn create(&self, item: NewItem) -> Result<Item, AppError> {
        let conn = self.db.0.lock().map_err(|_| AppError::DbLock)?;
        item_repository::insert(&conn, &item)?;
        Ok(item)
    }
    // 他 method ...
}
```

### 3.2 lib.rs setup でサービス登録

```rust
// src-tauri/src/lib.rs (setup)
let db = Arc::new(db::initialize(&db_path)?);
app.manage(ItemService::new(db.clone()));
app.manage(WorkspaceService::new(db.clone()));
app.manage(ThemeService::new(db.clone()));
// ... 他 service
```

### 3.3 command thin layer

```rust
// commands/item_commands.rs (A3 target)
#[tauri::command]
fn cmd_create_item(
    service: State<'_, ItemService>,
    item: NewItem,
) -> Result<Item, AppError> {
    service.create(item)
}
```

- command は **DTO 入出力 + service 呼び出しのみ** (5-10 LOC)
- `crate::db::DbState` は command から **完全に隠蔽**
- service test 時は `ItemService::new(test_db)` で fresh instance 作成可能

### 3.4 service 全 list と target State 登録 (15 service)

`ItemService` / `WorkspaceService` / `ThemeService` / `OpenerService` / `ConfigService` / `MetadataService` / `LaunchService` / `ExportService` / `WatchedPathService` / `SystemMonitorService` / `FileSearchService` / `WallpaperService` / `CrashMonitorService` / `ExeScannerService` / `KillSwitchService`

(`telemetry_service` / `file_search_state` / `icon_cache_*` は内部利用なので state 登録不要)

## 4. repository 整理 (V2 + V7 解消)

### 4.1 row_to_X helper を models/ へ移管 (V2 解消)

現状: `repositories/item_repository.rs` の `row_to_item` を `repositories/workspace_repository.rs` が import している (相互参照違反)。

target:

```rust
// models/item.rs (A3 target)
impl Item {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Self {
            id: row.get("id")?,
            // ...
        })
    }
}

// repositories/workspace_repository.rs (A3 target)
fn list_widgets(conn: &Connection, ...) -> Result<Vec<Widget>, AppError> {
    // ...
    let item = Item::from_row(&row)?;  // models 経由、repository は参照しない
}
```

同様に `Workspace::from_row` / `Tag::from_row` 等を **全 model に統一**。

### 4.2 launch_repository 単純化 (V2 解消)

現状: `launch_repository::list_recent` が item の join まで実行 → `item_repository` を import。

target:

```rust
// repositories/launch_repository.rs (A3 target)
pub fn list_recent_ids(conn: &Connection, limit: u32) -> Result<Vec<ItemId>, AppError> {
    // launch_log table から ID のみ取得
}

// services/launch_service.rs (A3 target)
pub fn list_recent(&self, limit: u32) -> Result<Vec<Item>, AppError> {
    let conn = self.db.0.lock()...;
    let ids = launch_repository::list_recent_ids(&conn, limit)?;
    item_repository::list_by_ids(&conn, &ids)  // service 層で join
}
```

### 4.3 tag_repository test の相互参照解消 (V2 残)

現状: `item_repository.rs` の test で `tag_repository` を import。

target: test fixture を `tests/common/` (将来作成) または `models/` の helper に移管。**refactor 期間中は test gate skip** なので優先度下げ可、test 再構築 phase で対応してもよい。

### 4.4 services/icon_cache_repository.rs 整理 (V7 解消)

現状: 命名上「repository」だが services/ 配下、in-memory cache 運用。

target:

- `services/icon_cache_service.rs` に rename
- 内部用語を `cache` に統一 (`get` / `put` / `invalidate`)
- DB 永続層 (`repositories/icon_cache_repository.rs`) と命名衝突を解消

## 5. watcher 整理 (V3 解消)

現状: `watcher/mod.rs` が `repositories/` を直接 use。

target:

- `services/watched_path_service::on_file_event(&self, event)` を新設
- watcher は service を呼ぶだけ (event 通知)
- service 内で repository 経由で DB 更新 (規約準拠)

## 6. AppError と エラーハンドリング (現状維持 + 微調整)

`utils/error.rs` の `AppError` (15 variants、`{ code, message }` Serialize) は良好設計。維持。

target は新規追加なし、ただし service struct 化に伴い、`Result<T, AppError>` 統一を再徹底。

## 7. Tauri State 戦略まとめ

```rust
// 設計判断 (A2 TR-3 準拠):
// - 各 service struct を個別に app.manage() (Arc 不要、Tauri が wrap)
// - command は State<'_, XxxService> で受ける
// - DbState は service struct 内に閉じる (command から見えない)
```

State 登録漏れ防止:

- `lib.rs` の setup phase で全 service の `app.manage()` を集約
- new service 追加時は lib.rs と handler! 両方を update

## 8. test 戦略 (refactor 期間中は skip、復活時の方針)

- service struct 化により mock 注入が容易に: `ItemService::new(test_db)` で fresh instance
- repository 直叩きを避けたことで、unit test は service 単位に集約
- Cargo test 復活時は service 単位に再構築 (`#[cfg(test)] mod tests` を service file 内に)

## 9. 移行順序 (build がブロックされない)

P0 内の依存順:

1. **V2 (row_to_X 移管)** を先に完了 → repository 相互参照解消
2. **V1 (service struct 化)** をその後 → 9 file 影響を 3 PR に分割
3. **V3 (watcher 整理)** は独立、いつでも

V7 (icon_cache rename) は独立、P0 と並行可。

詳細 PR list は `a3-migration-plan.md`。
