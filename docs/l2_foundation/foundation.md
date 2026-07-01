# Arcagate Foundation (L2)

L2 = **基本設計** = 全体アーキテクチャ。 Arcagate を技術的にどう組むかの単一情報源。

画面別の機能カタログは [`screens/`](./screens/) で個別管理。 テストシナリオ ⇄ 実装の link は [`test_scenarios.md`](./test_scenarios.md)。

---

## 1. アーキテクチャ overview

```
┌────────────────────────────────────────────────────────────┐
│              FRONTEND  (SvelteKit SPA + Svelte 5 runes)    │
│                                                            │
│  ┌────────────┐  ┌───────────┐  ┌───────────────────┐      │
│  │  Palette   │  │ Library   │  │  Workspace        │      │
│  └─────┬──────┘  └─────┬─────┘  └─────────┬─────────┘      │
│        │                │                  │                │
│  ┌─────▼────────────────▼──────────────────▼─────────┐     │
│  │   Frontend State ($state runes、 class-based)      │     │
│  │   + IPC Client (src/lib/ipc/*.ts、 typed wrappers) │     │
│  └────────────────────────┬──────────────────────────┘     │
├───────────────────────────┼────────────────────────────────┤
│            TAURI IPC BOUNDARY  (custom protocol)           │
│      commands = req/resp、 events = backend → frontend      │
├───────────────────────────┼────────────────────────────────┤
│              BACKEND  (Rust + Tauri v2)                     │
│                                                            │
│  ┌────────────────────────▼──────────────────────────┐     │
│  │  Command Layer  (thin、 src-tauri/src/commands/)   │     │
│  │  #[tauri::command] → 引数 parse → Service 呼出      │     │
│  └────────────────────────┬──────────────────────────┘     │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────┐     │
│  │  Service Layer  (business logic、 services/)        │     │
│  │  ItemService / LaunchService / ConfigService /      │     │
│  │  WorkspaceService / ThemeService / WatchedPath …    │     │
│  └────────────────────────┬──────────────────────────┘     │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────┐     │
│  │  Repository Layer  (data access、 repositories/)    │     │
│  │  ItemRepo / TagRepo / LogRepo / ConfigRepo …        │     │
│  └────────────────────────┬──────────────────────────┘     │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────┐     │
│  │  SQLite (rusqlite + WAL + Mutex<Connection>)        │     │
│  └─────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────┘
```

**設計の固定枠** (変えない):

- レイヤー: `commands → services → repositories → DB`、 **逆方向禁止**
- **Service Layer が全 IPC エントリーポイントの共通経路** (Command が Repository を直呼びしない)
- **Repository 間の相互参照禁止**
- `Mutex<Connection>` + WAL (Connection Pool は過剰)
- UUID v7 (時刻ソート可能 / グローバル一意)
- `include_str!` でマイグレーション SQL をバイナリに埋め込み
- ORM 不採用 (rusqlite + 生 SQL)

---

## 2. 技術スタック

### 2.1 デスクトップ層

| 項目      | 選定                         |
| --------- | ---------------------------- |
| Framework | **Tauri v2** (latest stable) |
| WebView   | WebView2 (Windows)           |

選定理由: IPC カスタムプロトコルで高速、 細粒度 capabilities/scopes、 Tauri v1 は EOL。

#### 採用プラグイン

| プラグイン                       | 用途                                    |
| -------------------------------- | --------------------------------------- |
| `tauri-plugin-global-shortcut`   | グローバルホットキー (Ctrl+Shift+Space) |
| tray-icon (built-in)             | システムトレイ常駐                      |
| `tauri-plugin-dialog`            | ファイル / フォルダ選択                 |
| `tauri-plugin-shell`             | 外部プロセス起動                        |
| `tauri-plugin-autostart`         | Windows 起動時 autostart                |
| `tauri-plugin-fs`                | filesystem アクセス                     |
| `tauri-plugin-clipboard-manager` | clipboard 読み書き                      |

### 2.2 Frontend 層

| 項目        | 選定                                                                 |
| ----------- | -------------------------------------------------------------------- |
| Framework   | **SvelteKit** + `@sveltejs/adapter-static` (**Svelte 5** runes mode) |
| CSS         | **Tailwind CSS v4**                                                  |
| UI 構成     | **shadcn-svelte** (Svelte 5 + Tailwind v4 対応)                      |
| 状態管理    | Svelte 5 runes (`$state` / `$derived`)、 外部ライブラリ不要          |
| Package mgr | **pnpm**                                                             |

選定理由: adapter-static で SPA 出力 (SSR 不要、 Tauri v2 公式 support)。 Svelte 5 runes で明示的 reactivity。 shadcn-svelte は code-owned (外部 runtime 依存なし)、 CSS 変数 base theme。

### 2.3 Backend 層

| 項目        | 選定                                                          |
| ----------- | ------------------------------------------------------------- |
| 言語        | **Rust** (stable toolchain)                                   |
| SQLite      | **rusqlite** (`bundled` feature、 system 依存ゼロ)            |
| Migration   | **rusqlite_migration** (forward-only、 SQL を `include_str!`) |
| ID          | **UUID v7** (`uuid` crate)                                    |
| Error 型    | **thiserror** + 自作 `AppError` enum                          |
| Hash        | **argon2** (password 用)                                      |
| Logger      | **tracing** + `tracing-subscriber`                            |
| FS Watch    | **notify** crate                                              |
| Type bridge | **ts-rs** (Rust struct → TS 型 自動生成)                      |

### 2.4 Test 層

| layer     | tool                                                       |
| --------- | ---------------------------------------------------------- |
| Rust unit | `cargo test` (`#[cfg(test)]`、 service / repo / migration) |
| E2E       | **Playwright** (CDP attach to WebView2)                    |

Frontend vitest は PR-Z で全削除済。 T1-T4 plan で incremental 再構築中 ([`test_scenarios.md`](./test_scenarios.md) 参照)。

---

## 3. レイヤー設計詳細

### 3.1 Service Layer (中核)

全 entry point (Tauri commands、 CLI binary) が経由する business logic 層。

```rust
pub trait ItemService: Send + Sync {
    fn create_item(&self, input: CreateItemInput) -> Result<Item>;
    fn update_item(&self, id: ItemId, input: UpdateItemInput) -> Result<Item>;
    fn delete_item(&self, id: ItemId) -> Result<()>;
    fn search_items(&self, query: &str, opts: SearchOptions) -> Result<Vec<ItemSearchResult>>;
}

pub trait LaunchService: Send + Sync {
    fn launch_item(&self, id: ItemId) -> Result<LaunchResult>;
    // 内部で ItemService 取得 + LogService 記録 + item_stats 更新 を統合
}
```

複雑度が低い service は `services/<name>_service.rs` に free function 形式で実装、 `AppServices` struct で集約 (V1 PR-A1 リファクタ後)。

### 3.2 Repository Layer

`rusqlite::Connection` への CRUD。 Repository 間の相互参照禁止 (service 層で組み合わせる)。

```rust
// repositories/item_repository.rs
pub fn insert(conn: &Connection, item: &Item) -> Result<(), AppError> { ... }
pub fn find_by_id(conn: &Connection, id: &str) -> Result<Item, AppError> { ... }
pub fn find_tracked_ids_under_path(conn: &Connection, path: &str)
    -> Result<Vec<String>, AppError> { ... }
```

### 3.3 Command Layer (thin)

Tauri IPC handler。 引数 deserialize → service 呼出 → 戻り値 serialize のみ。 ビジネスロジックを書かない。

```rust
#[tauri::command]
pub fn cmd_delete_item(services: State<AppServices>, id: String) -> Result<(), AppError> {
    services.item.delete_item(&id)
}
```

### 3.4 rusqlite Connection 管理

`Connection` は `Send` だが `!Sync` のため `Mutex<Connection>` で保持。

```rust
pub struct DbState(pub Mutex<rusqlite::Connection>);
// lib.rs で app.manage(DbState(Mutex::new(connection)))

#[tauri::command]
fn cmd_search_items(db: State<DbState>, query: String) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::search(&conn, &query)
}
```

1 user / 数百件以下のアイテム数では Pool は過剰、 Mutex で十分。 `launch_item` の `item 取得 → log 記録 → 統計更新` は単一 SQLite tx (process 起動自体は tx 外)。

---

## 4. IPC 境界

### 4.1 ルール

- 要求/応答 = `invoke`、 push/stream = `event`
- payload **< 10KB** 目安、 超えるなら分割 or file-based
- スキーマは **ts-rs** で Rust struct → TS 型を 自動生成 (`src/lib/bindings/`、 手書き禁止)
- 1 回の invoke が > 1s 見込みなら progress event 分割
- backend 処理が > 50ms 見込みなら frontend 側は非同期 + loading UI 必須
- **UI 応答目標: 入力 → 視覚反応まで < 100ms**

### 4.2 主要 commands

実装は `src-tauri/src/commands/<area>_commands.rs`、 全 64+ 件は code 参照。

| 領域                | 代表 command                                                                         |
| ------------------- | ------------------------------------------------------------------------------------ |
| `item`              | `cmd_create_item` / `cmd_search_items` / `cmd_launch_item` / `cmd_register_exe_item` |
| `workspace`         | `cmd_create_workspace` / `cmd_add_widget` / `cmd_update_widget_config`               |
| `config`            | `cmd_get_config` / `cmd_set_hotkey` / `cmd_mark_setup_complete`                      |
| `theme`             | `cmd_list_themes` / `cmd_create_theme` / `cmd_set_active_theme_mode`                 |
| `launch`            | `cmd_launch_item` / `cmd_list_recent` / `cmd_list_frequent` / `cmd_open_path`        |
| `watched_paths`     | `cmd_add_watched_path` / `cmd_remove_watched_path`                                   |
| `file_preview`      | `cmd_read_file_preview`                                                              |
| `image_scrap`       | `cmd_save_image_scrap`                                                               |
| `file_search`       | `cmd_start_file_search` / `cmd_cancel_file_search`                                   |
| `widget_item_hides` | `cmd_add_widget_item_hide` / `cmd_remove_widget_item_hide`                           |

### 4.3 Events

| event                   | payload               | 用途                  |
| ----------------------- | --------------------- | --------------------- |
| `tauri://drag-drop`     | `{ paths: string[] }` | OS-level file drop    |
| `tauri://drag-over`     | -                     | drag hover indicator  |
| `hotkey-triggered`      | -                     | global hotkey 押下    |
| `item://path-not-found` | path                  | watched_path 失効通知 |

### 4.4 Frontend IPC wrapper

`invoke` を直接呼ばず、 `src/lib/ipc/<area>.ts` の typed wrapper を経由する。

```typescript
// src/lib/ipc/items.ts
import { invoke } from '@tauri-apps/api/core';

export async function searchItems(query: string): Promise<Item[]> {
    return invoke<Item[]>('cmd_search_items', { query });
}
```

---

## 5. Frontend State 管理

Svelte 5 runes を **class-based singleton** で使用。 外部状態管理ライブラリ不要。

```typescript
// src/lib/state/palette.svelte.ts
class PaletteState {
    query = $state('');
    results = $state<Item[]>([]);
    selectedIndex = $state(0);
    selectedItem = $derived(this.results[this.selectedIndex] ?? null);

    async search(q: string) { /* IPC + setState */ }
}
export const paletteStore = new PaletteState();
```

パターン:

- `.svelte.ts` 拡張子 (Svelte 5 runes をコンポーネント外で使う signal)
- class フィールドが `$state` rune
- `$derived` getter で computed value
- singleton instance を export

---

## 6. エラーハンドリング

### 6.1 エラー型

```rust
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Item not found: {0}")]
    NotFound(String),
    #[error("Launch failed: {0}")]
    LaunchFailed(String),
    #[error("Validation error: {0}")]
    InvalidInput(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Database lock error")]
    DbLock,
    #[error("Watch failed: {0}")]
    WatchFailed(String),
}

// frontend へは { code: string, message: string } で serialize
impl serde::Serialize for AppError { /* code() メソッド + message */ }
```

### 6.2 伝播パターン

```
Repository (rusqlite::Error)
    → Service (AppError、 業務固有 error 生成)
    → Command (Result<T, AppError> をそのまま返す)
    → Frontend IPC wrapper (catch → toastStore.add)
```

### 6.3 禁止

- `let _ = result;` でエラー握り潰し
- main thread の IPC handler で `unwrap()` / `expect()`
- toast に英語 stack trace を出す

### 6.4 Arcagate 固有 pattern

- DB lock → 自動 3 回 retry + exponential backoff、 最終失敗で toast
- file watch 一時 error → re-subscribe、 上限で disabled state
- file I/O 失敗 → item 灰色化 / 削除提案

---

## 7. SQLite Schema

主要 table。 全 migration は `src-tauri/migrations/*.sql`、 `include_str!` でバイナリ埋込。 30+ migrations 適用済 (forward-only)。

```sql
-- 001_initial.sql 抜粋
CREATE TABLE items (
    id          TEXT    PRIMARY KEY,            -- UUID v7
    item_type   TEXT    NOT NULL,                -- 'exe' | 'url' | 'folder' | 'script' | 'command'
    label       TEXT    NOT NULL,
    target      TEXT    NOT NULL,                -- 実行 path / URL / folder / script / command
    args        TEXT,
    working_dir TEXT,
    icon_path   TEXT,                            -- APPDATA/icons/<uuid>.png
    icon_type   TEXT,
    aliases     TEXT,                            -- JSON array
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_enabled  INTEGER NOT NULL DEFAULT 1,
    is_tracked  INTEGER NOT NULL DEFAULT 1,      -- folder watch 連動 (cascade フラグ)
    default_app TEXT,                            -- per-item default opener (PH-003-M)
    card_override_json TEXT,                     -- per-card 視覚 override (PH-290)
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_label ON items(label COLLATE NOCASE);

CREATE TABLE tags (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    is_hidden   INTEGER NOT NULL DEFAULT 0,
    is_system   INTEGER NOT NULL DEFAULT 0,      -- sys-type-* / sys-ws-*
    prefix      TEXT, icon TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE item_tags (
    item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE TABLE launch_log (
    id          TEXT PRIMARY KEY,
    item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    launched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    launch_source TEXT NOT NULL DEFAULT 'palette'
);

CREATE TABLE workspaces (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    wallpaper_path TEXT, wallpaper_opacity REAL NOT NULL DEFAULT 0.6, wallpaper_blur INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE workspace_widgets (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    widget_type TEXT NOT NULL,
    position_x INTEGER NOT NULL DEFAULT 0, position_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 2, height INTEGER NOT NULL DEFAULT 2,
    config TEXT,    -- JSON per widget type
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE widget_item_hides (
    widget_id   TEXT NOT NULL REFERENCES workspace_widgets(id) ON DELETE CASCADE,
    item_target TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (widget_id, item_target)
);

CREATE TABLE watched_paths (
    id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, label TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE themes (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
    base_theme TEXT NOT NULL DEFAULT 'dark',
    css_vars TEXT NOT NULL DEFAULT '{}',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE openers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, exe_path TEXT NOT NULL, args TEXT,
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
```

### 設計方針

| 決定                        | 理由                                                                  |
| --------------------------- | --------------------------------------------------------------------- |
| UUID v7 を ID               | 時刻ソート可能、 import/export 時の ID 衝突回避                       |
| ISO 8601 TEXT で timestamp  | SQLite に native datetime 無し、 TEXT はソート可能 + 可読             |
| aliases / config を JSON 列 | 1 item あたり 1-5 件、 別 table より簡潔。 `json_each()` で query 可  |
| icon は file system         | base64 TEXT 比で 33% 容量削減、 search query で icon data load しない |
| `item_stats` 非正規化       | search 毎の COUNT(*) を回避、 service layer で更新                    |
| `ON DELETE CASCADE`         | 参照整合性保証、 `PRAGMA foreign_keys = ON`                           |
| Migration forward-only      | rollback なし、 必要なら新 migration で fix forward                   |

### PRAGMAs

```sql
PRAGMA journal_mode = WAL;        -- 読書並行性
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;       -- lock 競合 max 5 秒
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -8000;        -- 8MB page cache
```

### V2: 活動トラッカーの追加設計 (パーソナル observability)

V2 でパーソナル活動トラッカーを足す。 既存アーキに新パラダイムを持ち込まず、 そのまま乗せる:

- **時系列テーブルを分離追加**: `activity_event` / `file_event` / `system_metric` / `sessionized_activity` を migration で追加 (既存 item/workspace 系とは別)。 timestamp index 専用。 retention + downsampling (生1日→1分平均1週→1時間平均1年) を最初から組み込み DB 肥大を防ぐ。 DDL と方針は [Activity Store](./features/backend/activity-store.md)
- **収集は recorder スレッド**: notify 駆動の [Folder Watch](./features/backend/folder-watch.md) の兄弟として、 イベント購読 + 軽量 poll の [Activity Recorder](./features/backend/activity-recorder.md) を足す。 レイヤーは既存どおり `recorder → services → repositories → DB`
- **特権プロセス分離 (security)**: ファイル操作のフル捕捉に要る管理者権限 (USN Change Journal read は実機で admin 必須と確定) を、 「読むだけ・コード実行能力ゼロ」 の**別プロセス collector** に閉じ込め、 本体 (UI/launcher) は非特権のまま。 IPC は file_event の一方向・型付き転送に絞り、 特権側を任意実行の踏み台にしない。 詳細は [Activity Privilege Separation](./features/cross-cutting/activity-privilege-separation.md)
- **画面追加**: Library / Workspace と並ぶ第 3 画面 [Activity](./screens/activity.md) を route に足す (ウィンドウバー中央を 2 択 → 3 択トグルに拡張)

---

## 8. ディレクトリ構成

```
arcagate/
├── docs/                          # この doc 系
│   ├── motivation.md              # L0
│   ├── lessons.md                 # live single-file
│   ├── l1_requirements/.gitkeep   # gen-l1 待ち
│   ├── l2_foundation/
│   │   ├── foundation.md          # 本 file
│   │   ├── test_scenarios.md
│   │   └── screens/
│   └── l3_phases/
│       ├── _archive/              # 完了済 plan
│       └── _template/
│
├── src/                           # SvelteKit frontend
│   ├── app.html / app.css
│   ├── lib/
│   │   ├── components/            # UI components
│   │   │   ├── ui/                # shadcn-svelte (手動編集禁止)
│   │   │   ├── arcagate/          # 業務 component (library/palette/workspace/common)
│   │   │   ├── item/              # ItemForm 系
│   │   │   ├── settings/          # 設定画面
│   │   │   └── setup/             # SetupWizard
│   │   ├── widgets/               # folder-per-widget (各 widget が 1 dir)
│   │   │   ├── _shared/
│   │   │   ├── favorites/, recent/, projects/, item/, stats/,
│   │   │   ├── quick-note/, daily-task/, snippet/, clipboard-history/,
│   │   │   ├── exe-folder/, file-search/, system-monitor/,
│   │   │   ├── image-scrap/, file-preview/
│   │   ├── ipc/                   # invoke wrapper (型付き)
│   │   ├── state/                 # runes singleton (.svelte.ts)
│   │   ├── types/ + bindings/     # bindings は ts-rs 自動生成
│   │   ├── constants/ + styles/ + utils/
│   └── routes/
│       ├── +layout.svelte         # tray / hotkey listener
│       ├── +page.svelte           # main (Library / Workspace / Settings)
│       └── palette/+page.svelte   # floating palette
│
├── src-tauri/                     # Rust backend
│   ├── Cargo.toml, build.rs, tauri.conf.json
│   ├── capabilities/, icons/
│   ├── migrations/                # *.sql、 include_str! でバイナリ埋込
│   └── src/
│       ├── main.rs / lib.rs       # entry + Tauri app setup
│       ├── bin/arcagate_cli.rs    # CLI binary
│       ├── commands/              # thin layer (Tauri IPC handler)
│       ├── services/              # business logic
│       ├── repositories/          # DB CRUD
│       ├── models/                # struct/enum
│       ├── plugin_api/            # 将来 plugin trait 定義のみ
│       ├── watcher/               # notify による FS 監視
│       ├── launcher/              # process 起動
│       ├── db/                    # init + migrations
│       └── utils/                 # error / icon / git 等
│
├── tests/                         # Playwright E2E
│   ├── fixtures/ + helpers/ + e2e/
├── .github/workflows/             # ci.yml / release.yml / e2e.yml
└── CLAUDE.md                      # session 開始時必読 (root)
```

### 設計の要点

| dir                         | 設計意図                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| `src/lib/ipc/`              | `invoke` を直接呼ばず typed wrapper 経由で TS 型安全性           |
| `src/lib/state/`            | `.svelte.ts` 拡張子で runes をコンポーネント外から使う           |
| `src/lib/widgets/`          | folder-per-widget。 本体 / settings / index.ts を同 dir          |
| `src-tauri/migrations/`     | `include_str!` でバイナリ埋込、 実行時 file 依存なし             |
| `src-tauri/src/plugin_api/` | trait 定義のみ、 将来 plugin 追加時のリファクタ防止              |
| `src-tauri/src/watcher/`    | `notify` で FS 監視、 BG thread が変更検知 → frontend event 送信 |

---

## 9. 設計判断 (技術判断基準)

### 9.1 Q-Tree (Frontend / Backend 分担)

上から順に判定:

1. OS-level アクセス必要？ → **Rust**
2. file / DB に触れる？ → **Rust**
3. 同時 100 件超処理？ → **Rust**
4. 16ms 以上 UI を止める可能性？ → **Rust**
5. アプリ再起動を跨いで状態必要？ → **Rust (DB) + Frontend (表示)**
6. 上記全て No → **Frontend**

### 9.2 機能・処理分類 (現状)

| 機能               | 場所       | 根拠                        |
| ------------------ | ---------- | --------------------------- |
| アイテム起動       | Rust       | OS command 実行は Rust 必須 |
| filesystem watch   | Rust       | OS native 通知必要          |
| 検索フィルタ       | Rust (SQL) | SQL index 有効              |
| タグ統計集計       | Rust (SQL) | GROUP BY は DB 側効率的     |
| アイコン抽出       | Rust       | Windows API / exe parse     |
| 起動履歴記録       | Rust (SQL) | 永続化                      |
| Git ステータス     | Rust       | CLI 実行は Rust 安全        |
| Theme CSS 変数適用 | Frontend   | DOM 操作はフロント最適      |
| D&D                | Frontend   | UI event                    |
| Theme 編集         | Frontend   | CSS var parse               |

### 9.3 依存 curated list (同役割で 2 つ以上採用しない)

| 役割              | 選定                                       |
| ----------------- | ------------------------------------------ |
| Frontend 状態管理 | Svelte 5 runes のみ。 redux / zustand 不可 |
| 日付処理          | JS 標準 `Date` / `Intl`                    |
| UUID              | `uuid` crate v7                            |
| CSS-in-JS         | なし (Tailwind + CSS 変数のみ)             |
| Rust HTTP         | 原則使わない (offline 完結)                |
| Rust serialize    | `serde` + `serde_json`                     |
| Rust error        | `thiserror` + `AppError` (`anyhow` 不可)   |
| Logger            | `tracing` + `tracing-subscriber`           |
| ORM               | 不使用 (rusqlite + 生 SQL)                 |

新規依存追加の判断:

1. `std` / 既存依存で足りないか (3 分で書けるなら書く)
2. 最終更新 < 12 ヶ月、 weekly downloads > 10k、 license OK
3. exe 20MB / idle 120MB / 起動 2.5 秒の 3 目標を維持できるか

### 9.4 リファクタ発動閾値

| 指標                  | 閾値                        |
| --------------------- | --------------------------- |
| 関数 LoC              | 50 warning / 100 refactor   |
| file LoC              | 500 warning / 1000 refactor |
| Cyclomatic complexity | 10 warning / 20 refactor    |
| Fan-out               | 15 超                       |
| Duplicate code        | 5 行 × 3 箇所以上           |
| Deep nesting          | 4 level 以上                |
| Parameter count       | 4 warning / 6 refactor      |
| Circular deps         | 存在で即 fail               |

### 9.5 新規機能 gate

1. Non-goals に該当しない (クラウド同期 / 他 OS / ターミナル統合 等)
2. パフォーマンス目標を悪化させない
3. UX 仕様整合 ([`screens/`](./screens/) 参照)
4. デザイントークン整合 (`--ag-*` token 使用、 shadcn 手動編集なし、 color hardcode 禁止)
5. 依存予算通過 / 複雑度予算通過
6. 1-2 PR で収まる規模

「**なくても毎日使えるか？**」 で問う。 Yes なら追加しない。

---

## 10. 非機能要求

| 要求         | 目標                      | 技術 approach                                                     |
| ------------ | ------------------------- | ----------------------------------------------------------------- |
| 常駐メモリ   | Idle Working Set ≤ 120MB  | Tauri v2 + rusqlite bundled                                       |
| 起動 latency | P95 ≤ 2,500ms             | Tauri IPC custom protocol + SQLite WAL + index 最適化             |
| Palette 表示 | P95 ≤ 120ms               | preload + Tauri webview 隠し表示                                  |
| アイテム起動 | P95 ≤ 200ms               | launch IPC 直接 + log 記録は非同期                                |
| バイナリ     | exe ≤ 20MB                | Tauri v2 + bundled SQLite                                         |
| データ保存   | ローカル完結              | SQLite (cloud 同期なし)                                           |
| CSP          | Tauri v2 default CSP 準拠 | `ipc:` / `asset:` のみ許可、 `unsafe-inline` / `unsafe-eval` 禁止 |

---

## 11. CI/CD

| workflow | file                            | 概要                                                                            |
| -------- | ------------------------------- | ------------------------------------------------------------------------------- |
| CI       | `.github/workflows/ci.yml`      | biome / dprint / clippy / rustfmt / svelte-check / cargo test / lefthook audits |
| E2E      | `.github/workflows/e2e.yml`     | Playwright (Windows runner、 T1 smoke 5 件 + T2 critical path + T3 regression)  |
| Release  | `.github/workflows/release.yml` | tag push → Tauri build + tauri signer (Tier 1) + cosign sign-blob (Tier 2)      |

### Lefthook (local pre-commit)

12 hook 全部 staged file scope: biome / dprint / rustfmt / clippy / svelte-check / cargo-test / design-tokens / label-audit / widget-coverage / widget-shell / aria-icon-only / text-overflow / handle-style / font-hardcode / keyboard-traps / widget-settings-schema / hotkey-consistency / no-horizontal-scrollbar

---

## 12. 用語集

| 用語                 | 定義                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| **Item**             | Arcagate 登録の起動対象。 exe / URL / folder / script / command の 5 type                                 |
| **Palette**          | Ctrl+Shift+Space で出る検索 UI、 Arcagate の core interface                                               |
| **Workspace**        | widget を自由配置できる custom page、 複数ページ可                                                        |
| **Widget**           | Workspace に配置する mini app (14 type)。 `src/lib/widgets/<name>/` で folder-per-widget 構成             |
| **Service Layer**    | business logic 集約層、 全 IPC entry point が経由                                                         |
| **Repository**       | DB CRUD 層、 service から呼ばれる                                                                         |
| **Opener**           | アイテムを開く方法 (default app override 用)、 per-item / widget-level / global の 3 段 cascade           |
| **sys-type-\***      | システム tag (item_type 別: exe / url / folder / script / command)                                        |
| **sys-ws-\***        | システム tag (workspace 別)、 widget 経由で auto-register 時に attach                                     |
| **WidgetShell**      | 全 widget 共通の header + container component (`src/lib/components/arcagate/common/WidgetShell.svelte`)   |
| **AppError**         | `{ code, message }` で frontend serialize される error 型                                                 |
| **Cascade**          | `ON DELETE CASCADE` (FK) + 業務 logic (widget config 自動除去 / watched_path 削除時 item 自動削除)        |
| **Plugin Interface** | `plugin_api/` の trait 定義 (`ItemProvider` / `CommandProvider`)、 将来 plugin 追加用、 現在は trait のみ |

---

## 参照

- 画面別カタログ → [`screens/`](./screens/)
- 機能契約 (Functional Spec、各 feature の「やること / やらないこと / 性能予算」) → [`features/`](./features/)
- テストシナリオ ⇄ 実装 link → [`test_scenarios.md`](./test_scenarios.md)
- 製品要求 / Non-goals → [`../l0_ideas/motivation.md`](../l0_ideas/motivation.md)
- 失敗駆動メモリ → [`./lessons.md`](./lessons.md)
- アーカイブ済 plan → [`../l3_phases/_archive/`](../l3_phases/_archive/)
