# A2 Tauri v2 + Rust Best Practices

調査時点: 2026-05-06。引用元 URL は各 section 末尾。

## 1. Tauri v2 公式 architecture

### 1.1 Core / Shell pattern

- **Core (Rust)**: 1 process。privileged native code、IPC handler、command 実行
- **Shell (Webview)**: 各 window が独立 process。frontend code 動作。Core からは IPC 経由でのみ制御
- 通信は **command** (request-reply) と **event** (publish-subscribe) の 2 channel
- 出典: [Tauri Architecture (v2)](https://v2.tauri.app/concept/architecture/), [Process Model](https://v2.tauri.app/concept/process-model/)

### 1.2 Command pattern

```rust
#[tauri::command]
fn cmd_xxx(state: State<'_, Mutex<AppState>>, args: Args) -> Result<Output, AppError> {
    let mut state = state.lock().unwrap();
    // logic
}
```

- frontend は `invoke('cmd_xxx', args)` で呼ぶ
- command 名は登録時に handler! macro で集約: `tauri::generate_handler![cmd_xxx, ...]`
- 出典: [Tauri Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/)

### 1.3 公式 doc の **限界**

公式 doc は app-level の service / repository / domain layer を規定**しない**。これらは開発者が実装層を作る。Arcagate の現「commands → services → repositories → DB」設計は app-level の決め事 (CLAUDE.md `設計の固定枠` 参照)。

## 2. State management 公式パターン

### 2.1 Mutex<T> vs Arc<Mutex<T>>

- **`tauri::State<T>` を使う場合、`Arc` は不要**。Tauri が内部で `Arc` ラップ
- ❌ `Arc<Mutex<AppState>>` を `manage()` する誤用は多いが過剰
- ✓ `Mutex<AppState>` を `app.manage()` し、`State<'_, Mutex<AppState>>` で受ける

### 2.2 典型 usage

```rust
// setup
fn setup(app: &mut App) {
    app.manage(Mutex::new(AppState { counter: 0 }));
    Ok(())
}

// command
#[tauri::command]
fn increase(state: State<'_, Mutex<AppState>>) -> u32 {
    let mut s = state.lock().unwrap();
    s.counter += 1;
    s.counter
}
```

### 2.3 複数 state の管理

- 個別に `app.manage()` 呼ぶ (`app.manage(db)`、`app.manage(icon_cache)` 等)
- 各 command は必要な state のみ受け取る (`State<'_, X>`、`State<'_, Y>`)

### 2.4 command 外からの access (event handler / spawn)

```rust
let handle: AppHandle = window.app_handle();
let state = handle.state::<Mutex<AppState>>();
let mut s = state.lock().unwrap();
```

### 2.5 Mutex の選択

- **`std::sync::Mutex` 推奨** (async でも OK)
- `tokio::sync::Mutex` は **DB connection など IO を await 跨ぎで保持する場合のみ**
- `parking_lot::Mutex` には公式 doc 言及なし (community wise の選択肢)

出典: [Tauri State Management (v2)](https://v2.tauri.app/develop/state-management/)

## 3. Yaak の architecture (大規模 ref impl)

10.8k stars。Tauri v2 + Rust + React。API client。

### 3.1 Cargo workspace + 多 crate 分割

src-tauri/ 配下に **9+ crate** で workspace 構成:

| crate                                              | 役割                                   |
| -------------------------------------------------- | -------------------------------------- |
| `yaak-models`                                      | local-first data persistence (SQLite)  |
| `yaak-plugins`                                     | Plugin manager + WebSocket IPC         |
| `yaak-templates`                                   | Template tokenize / transform / render |
| `yaak-http` / `yaak-grpc` / `yaak-ws` / `yaak-sse` | プロトコル別実装                       |
| `yaak-sync` / `yaak-crypto`                        | utility                                |

### 3.2 src-tauri/src/ の構造

- `lib.rs` — Tauri command handlers (frontend へ expose する関数を集約)
- `main.rs` — エントリーポイント
- `http_request.rs` — HTTP/GraphQL 実行 (3-phase pipeline: Resolution → Rendering → Execution)
- `grpc.rs`, `render.rs`, `updates.rs`, `uri_scheme.rs`, `error.rs`

### 3.3 責務分担 (Yaak の場合)

| 層             | 実装                                         |
| -------------- | -------------------------------------------- |
| DB             | `yaak-models/query_manager.rs` (SQLite ACID) |
| IPC            | `lib.rs` の command + `yaak-plugins` event   |
| Business logic | `http_request.rs` (3-phase pipeline)         |
| Storage        | filesystem (`$APPDATA/responses/`)           |
| Secrets        | OS keychain (`keyring` crate)                |

### 3.4 注意: Yaak は **明示的 service/repository layer 分離は無い**

- `commands → services → repositories` のような **layer 命名で subdir 分け**ていない
- 代わりに **crate 境界**で責務を切る (yaak-models が DB 層、lib.rs が IPC 層 etc.)
- Arcagate は subdir 分離 (`commands/`, `services/`, `repositories/`) を採用しているが、Yaak は **crate 分離**で同じ目的を達成している
- どちらも valid。Arcagate のサイズ感では subdir 分離で十分、crate 分離は build 時間 / 依存管理の overhead が増える

出典: [Yaak DeepWiki](https://deepwiki.com/mountain-loop/yaak), [Yaak GitHub](https://github.com/mountain-loop/yaak)

## 4. Service / Repository / Command の応用パターン (Tauri ecosystem 一般)

### 4.1 thin command + service pattern

公式が規定しない代わりに、community で広く採用されている形:

```rust
// services/item_service.rs
pub struct ItemService {
    db: Arc<DbState>,  // 注: Tauri の State なら Arc 不要、共有用 service struct で持つときは Arc
}

impl ItemService {
    pub fn new(db: Arc<DbState>) -> Self { Self { db } }
    pub fn create(&self, item: NewItem) -> Result<Item, AppError> {
        let conn = self.db.0.lock().unwrap();
        item_repository::insert(&conn, &item)?;
        Ok(item)
    }
}

// commands/item_commands.rs
#[tauri::command]
fn cmd_create_item(
    service: State<'_, ItemService>,
    item: NewItem,
) -> Result<Item, AppError> {
    service.create(item)
}
```

### 4.2 利点

- command 関数は **DTO 入出力 + service 呼び出しのみ** (5-10 LOC で完結)
- service が `db` を内包し、testable (mock service を注入)
- repository は service からのみ呼ばれ、layer skip を防げる

### 4.3 Arcagate 現状 (V1 違反) との関係

- 現在 9 file で `commands/` が `crate::db::DbState` を直接受け、service に渡している
- service は struct ではなく **module 内 function** (`item_service::create(db, item)`)
- service struct 化 + `app.manage()` で `State<'_, ItemService>` 注入する形に移行すれば V1 解消

## 5. Cargo workspace 分割の判断基準 (Yaak のような分割をすべきか)

Yaak は 9+ crate に分割しているが、Arcagate サイズ (11,462 LOC) で同様の分割が必要か:

| 観点       | crate 分割                         | subdir 分離           |
| ---------- | ---------------------------------- | --------------------- |
| build 時間 | crate 単位で並列、incremental 高速 | 1 crate full rebuild  |
| 依存管理   | Cargo.toml で明示                  | use crate::xxx で暗黙 |
| 責務分離   | 物理境界で強制                     | 命名規則で運用        |
| 学習コスト | workspace 概念必須                 | 通常の Rust 構成      |

**Arcagate の判断**: 現サイズでは subdir 分離で十分。crate 分割は LOC 30k+ / build 時間 5min+ の段階で再検討。A3 でも crate 分割は **将来検討項目**として保留。

## 6. その他補足

- **ts-rs bindings**: 現状 `src/lib/bindings/` に 1 file 集約。Yaak は複数 file 構成だが、Arcagate サイズでは 1 file で十分。A3 で要否再考。
- **plugin API**: Arcagate は個人ランチャーで外部拡張なし。Tauri v2 公式 plugin (clipboard / fs / shell / global_shortcut / autostart / dialog / updater / log) は使用済。Yaak のような独自 plugin runtime は不要。

## 主要 source link

- [Tauri Architecture (v2)](https://v2.tauri.app/concept/architecture/)
- [Tauri State Management (v2)](https://v2.tauri.app/develop/state-management/)
- [Tauri Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/)
- [Tauri Process Model](https://v2.tauri.app/concept/process-model/)
- [Yaak GitHub (mountain-loop/yaak)](https://github.com/mountain-loop/yaak)
- [Yaak DeepWiki](https://deepwiki.com/mountain-loop/yaak)
- [awesome-tauri](https://github.com/tauri-apps/awesome-tauri)
- [tauri::Manager trait (rustdoc)](https://docs.rs/tauri/latest/tauri/trait.Manager.html)
