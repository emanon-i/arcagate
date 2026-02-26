---
status: done
---

# Arcagate システム構成

## 1. 技術スタック

### 1.1 デスクトップフレームワーク

| 項目 | 選定 |
|---|---|
| フレームワーク | **Tauri v2** (latest stable) |

**選定理由**:
- v1はメンテナンスモード（セキュリティ修正のみ）。新規プロジェクトでv1を選ぶ理由がない
- プラグインAPI: コア機能自体がプラグインとして実装されており、Arcagateの「全機能はプラグイン」思想と合致
- IPC: カスタムプロトコル（HTTP-like）でv1より高速。バイナリペイロード対応
- パーミッションモデル: 細粒度のcapabilities/scopes（M2c MCP連携時に必要）
- ネイティブコンテキストメニューAPI（M3で必要）

**不採用**: Tauri v1（メンテナンスモード、技術的負債になる）

#### Tauri v2 プラグイン一覧（M1で使用）

| プラグイン | 用途 |
|---|---|
| `tauri-plugin-global-shortcut` | グローバルホットキー |
| tray-icon (built-in feature) | システムトレイ常駐 |
| `tauri-plugin-dialog` | ファイル選択ダイアログ（アイテム登録時） |
| `tauri-plugin-shell` | 外部プロセス起動 |
| `tauri-plugin-autostart` | Windows起動時の自動起動 |
| `tauri-plugin-fs` | ファイルシステムアクセス（D&D等） |

### 1.2 フロントエンド

| 項目 | 選定 |
|---|---|
| フレームワーク | **SvelteKit** + `@sveltejs/adapter-static` (**Svelte 5**, runes) |
| CSS | **Tailwind CSS v4** |
| UIコンポーネント | **shadcn-svelte** (Svelte 5 + Tailwind v4 対応版) |
| 状態管理 | Svelte 5 runes ($state, $derived) — 外部ライブラリ不要 |
| パッケージマネージャ | **pnpm** |

**SvelteKit + adapter-static の選定理由**:
- SPA出力（index.html + JS/CSS）。SSRサーバー不要。Tauri v2公式サポート
- ファイルベースルーティング: M2bのワークスペースページ追加時にルーター手動設定が不要
- レイアウト・エラーバウンダリ等の開発体験が標準で利用可能

**Svelte 5 の選定理由**:
- runes ($state, $derived, $effect) による明示的なリアクティビティ。Svelte 4の暗黙的リアクティビティより予測しやすい
- パフォーマンス: ゼロから書き直されたランタイム。バンドルサイズ削減
- エコシステム全体がSvelte 5に移行済み（shadcn-svelte, Bits UI等）

**shadcn-svelte の選定理由**:
- コード所有型: プロジェクトにコピーされるため、外部ランタイム依存なし。自由に改変可能
- Bits UIベース: アクセシブルなヘッドレスプリミティブの上にプリスタイルを提供
- `Command` コンポーネント: cmdk パターンのコマンドパレットが標準提供。Arcagateのコア UI に直結
- CSS変数ベースのテーマ: M2bのカスタムテーマ機能への拡張パスがある

**Tailwind CSS v4 の選定理由**:
- shadcn-svelte がネイティブサポート
- CSS-first config（tailwind.config.js 不要）、Lightning CSSエンジン
- 最大のエコシステム・ドキュメント

**不採用**:
- plain Svelte + Vite: SPA出力のTauri公式サポート・HMR・ファイルベースルーティングによるM2bページ追加の容易さを欠く
- Svelte 4: Svelte 5がstable。greenfieldで旧版を選ぶ理由なし
- Skeleton UI: コマンドパレット向けコンポーネントが弱い
- Bits UIのみ: 全コンポーネントのスタイリングをゼロから書く必要があり、個人プロジェクトには高コスト

### 1.3 バックエンド

| 項目 | 選定 |
|---|---|
| 言語 | **Rust** (stable toolchain) |
| SQLiteアクセス | **rusqlite** (`bundled` feature) |
| マイグレーション | **rusqlite_migration** |
| ID生成 | **UUID v7** (`uuid` crate) |
| エラー型導出 | **thiserror** |
| パスワードハッシュ | **argon2** |

**rusqlite の選定理由**:
- SQLite専用の軽量ラッパー。マルチDB抽象のオーバーヘッドなし
- sync API: Tauriのコマンドはスレッドプールで実行されるため、blocking SQLite呼び出しでUIをブロックしない
- `bundled` feature: SQLiteをバイナリに直接コンパイル。システム依存ゼロ、一貫した動作を保証
- 個人プロジェクトの単純なクエリに対して、生SQLが最も透明でデバッグしやすい

**rusqlite_migration の選定理由**:
- SQLiteの `user_version` pragma を利用（追加テーブル不要）
- SQLファイルを `include_str!` でバイナリに埋め込み。外部ファイル依存なし、CLI不要

**UUID v7 の選定理由**:
- 時刻ソート可能（タイムスタンプベース）
- グローバルに一意（エクスポート/インポート時の衝突回避）
- auto-increment と異なり、外部からIDを推測しにくい

**不採用**:
- sqlx: マルチDB抽象がSQLite専用プロジェクトに過剰。async不要。コンパイル時SQLチェックにはDB接続かsqlx-data.json管理が必要
- diesel: マクロシステムが重い、diesel CLI必要、スキーマDSLの学習コスト。個人ランチャーには過剰
- sea-orm: sqlx上のORM。asyncレイヤー＋ORMレイヤーの二重オーバーヘッド

### 1.4 テスト

| レイヤー | ツール | タイミング |
|---|---|---|
| Rust ユニットテスト | `cargo test` | M1（service + repository層） |
| Svelte コンポーネントテスト | vitest + `@testing-library/svelte` | M1（重要コンポーネントのみ） |
| Tauri コマンド統合 | `cargo test` + テストヘルパー | M1 |
| E2E（デスクトップ） | WebdriverIO | M2+（後回し。M1完了時に手動E2Eチェックリストを作成） |

**WebdriverIO の選定理由（E2E）**:
- PlaywrightはTauriのネイティブAPIをサポートしていない
- WebdriverIOはTauriデスクトップアプリの公式推奨E2Eツール

## 2. アーキテクチャ

### 2.1 コンポーネント構成図

```
┌──────────────────────────────────────────────────────────┐
│                 FRONTEND (SvelteKit SPA / Svelte 5)       │
│                                                           │
│  ┌────────────┐  ┌───────────┐  ┌───────────────────┐    │
│  │ Command    │  │ Settings  │  │ Workspace (M2b)   │    │
│  │ Palette    │  │ UI        │  │                   │    │
│  └──────┬─────┘  └─────┬─────┘  └─────────┬─────────┘    │
│         │              │                   │              │
│  ┌──────▼──────────────▼───────────────────▼───────────┐  │
│  │         Frontend State ($state runes)                │  │
│  │       + IPC Client (typed wrappers over invoke)      │  │
│  └──────────────────────┬──────────────────────────────┘  │
├─────────────────────────┼─────────────────────────────────┤
│               TAURI IPC BOUNDARY                          │
│          commands = request/response                      │
│          events   = backend → frontend                    │
├─────────────────────────┼─────────────────────────────────┤
│                 BACKEND (Rust)                             │
│                                                           │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Command Layer (thin)                       │  │
│  │   #[tauri::command] — 引数パース → Service呼び出し    │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Service Layer (ビジネスロジック)             │  │
│  │   ItemService, LaunchService, LogService,            │  │
│  │   ConfigService                                      │  │
│  │   *** Plugin Interface Boundary (M1でtrait定義) ***   │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Repository Layer (データアクセス)            │  │
│  │   ItemRepo, CategoryRepo, TagRepo, LogRepo, ConfigRepo│  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │                 SQLite (rusqlite)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       将来のエントリーポイント（同じService Layer）     │  │
│  │       CLI (M2a) | MCP Server (M2c)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**設計原則**: MCP・UI・CLIは同一のService Layerを経由する。どのエントリーポイントからでも同じ操作結果を保証する。

### 2.2 ディレクトリ構成

```
arcagate/
├── docs/                           # 設計ドキュメント（既存）
│   ├── l0_ideas/
│   ├── l1_requirements/
│   ├── l2_foundation/
│   └── l3_phases/
│
├── src/                            # SvelteKit フロントエンド
│   ├── app.html                    # HTMLテンプレート
│   ├── app.css                     # グローバルCSS（Tailwind v4 import）
│   ├── lib/                        # 共有コード ($lib エイリアス)
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn-svelte コンポーネント
│   │   │   │   ├── button/
│   │   │   │   ├── command/        # コマンドパレットプリミティブ
│   │   │   │   ├── dialog/
│   │   │   │   ├── input/
│   │   │   │   └── scroll-area/
│   │   │   ├── palette/            # Arcagate コマンドパレット
│   │   │   │   ├── Palette.svelte
│   │   │   │   ├── PaletteItem.svelte
│   │   │   │   └── PaletteInput.svelte
│   │   │   ├── item/               # アイテム管理
│   │   │   │   ├── ItemForm.svelte
│   │   │   │   └── ItemCard.svelte
│   │   │   ├── settings/           # 設定画面
│   │   │   └── setup/              # セットアップウィザード (REQ-006)
│   │   ├── ipc/                    # Tauri IPC 型付きラッパー
│   │   │   ├── items.ts
│   │   │   ├── categories.ts
│   │   │   ├── tags.ts
│   │   │   ├── log.ts
│   │   │   ├── config.ts
│   │   │   ├── setup.ts
│   │   │   ├── visibility.ts
│   │   │   └── events.ts
│   │   ├── state/                  # グローバルステート (runes)
│   │   │   ├── palette.svelte.ts
│   │   │   ├── settings.svelte.ts
│   │   │   └── items.svelte.ts
│   │   ├── types/                  # TypeScript 型定義
│   │   │   ├── item.ts
│   │   │   ├── category.ts
│   │   │   ├── tag.ts
│   │   │   └── config.ts
│   │   └── utils/                  # ユーティリティ
│   └── routes/                     # SvelteKit ファイルベースルーティング
│       ├── +layout.svelte          # ルートレイアウト（トレイ・ホットキーリスナー）
│       ├── +page.svelte            # メインページ（コマンドパレット）
│       └── settings/
│           └── +page.svelte        # 設定ページ
│
├── src-tauri/                      # Rust バックエンド (Tauri v2)
│   ├── Cargo.toml
│   ├── build.rs                    # Tauri ビルドスクリプト
│   ├── tauri.conf.json             # Tauri 設定
│   ├── capabilities/               # Tauri v2 パーミッション定義
│   │   └── default.json
│   ├── icons/                      # アプリアイコン
│   ├── migrations/                 # SQLite マイグレーション SQL
│   │   └── 001_initial.sql
│   └── src/
│       ├── main.rs                 # エントリーポイント (Windows: コンソール非表示)
│       ├── lib.rs                  # Tauri app setup, コマンド登録
│       ├── commands/               # Tauri コマンドハンドラ (thin layer)
│       │   ├── mod.rs
│       │   ├── item.rs
│       │   ├── category.rs
│       │   ├── tag.rs
│       │   ├── visibility.rs
│       │   ├── log.rs
│       │   ├── config.rs
│       │   ├── setup.rs
│       │   └── data.rs
│       ├── services/               # ビジネスロジック
│       │   ├── mod.rs
│       │   ├── item_service.rs
│       │   ├── launch_service.rs
│       │   ├── log_service.rs
│       │   ├── tag_service.rs
│       │   ├── config_service.rs
│       │   └── setup_service.rs
│       ├── repositories/           # データアクセス (rusqlite)
│       │   ├── mod.rs
│       │   ├── item_repo.rs
│       │   ├── category_repo.rs
│       │   ├── tag_repo.rs
│       │   ├── log_repo.rs
│       │   └── config_repo.rs
│       ├── models/                 # ドメインモデル・DTO
│       │   ├── mod.rs
│       │   ├── item.rs
│       │   ├── category.rs
│       │   ├── tag.rs
│       │   └── launch_log.rs
│       ├── plugin_api/             # プラグイン trait 定義 (M1: traitのみ)
│       │   ├── mod.rs
│       │   ├── item_provider.rs
│       │   ├── command_provider.rs
│       │   └── plugin.rs
│       ├── watcher/                # ファイル監視抽象化 (M1: trait定義のみ)
│       │   ├── mod.rs
│       │   └── traits.rs           # FileWatcher trait (M2パス追跡・M4インデックスで共用)
│       ├── launcher/               # プロセス起動ロジック
│       │   ├── mod.rs
│       │   ├── exe.rs
│       │   ├── url.rs
│       │   ├── script.rs
│       │   └── folder.rs
│       ├── db/                     # DB初期化・マイグレーション
│       │   ├── mod.rs
│       │   └── migrations.rs
│       └── utils/                  # 共有ユーティリティ
│           ├── mod.rs
│           ├── icon.rs             # .exe からのアイコン抽出
│           └── error.rs            # エラー型定義
│
├── static/                         # 静的アセット
├── package.json
├── pnpm-lock.yaml
├── svelte.config.js                # SvelteKit config (static adapter)
├── vite.config.ts
├── tsconfig.json
└── .gitignore                      # (既存)
```

**ディレクトリ設計の要点**:

| ディレクトリ | 設計意図 |
|---|---|
| `src/lib/ipc/` | フロントエンドは `invoke` を直接呼ばない。型付きラッパー経由でTypeScript型安全性を確保 |
| `src/lib/state/` | `.svelte.ts` 拡張子でコンポーネント外からrunesを使用（Svelte 5推奨パターン） |
| `src-tauri/migrations/` | SQLファイルを `include_str!` でバイナリに埋め込み。実行時ファイル依存なし |
| `src-tauri/src/plugin_api/` | M1ではtrait定義のみ。M2でプラグインローディングを追加する際のリファクタを防止 |
| `src/lib/components/setup/` | セットアップウィザード（REQ-006）。初回起動時のみモーダルダイアログとして表示（独立ルートではない） |
| `src-tauri/src/watcher/` | ファイル監視の抽象化trait。M1ではtrait定義のみ。M2（パス追跡）・M4（インデックス）で共用 |
| `src-tauri/src/launcher/` | アイテムタイプ別に分離（exe/url/script/folder）。共通の `Launcher` trait で抽象化 |

### 2.3 Service Layer 設計

Service LayerはArcagateの中核。全エントリーポイント（UI, CLI, MCP）がここを経由する。

```
UI (Tauri commands)  ─┐
CLI (M2a)            ─┼─→  Service Layer  →  Repository Layer  →  SQLite
MCP Server (M2c)     ─┘
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

| 論理名 | invoke名 | 引数 | 戻り値 |
|---|---|---|---|
| `item::create` | `item_create` | CreateItemInput | Item |
| `item::update` | `item_update` | id, UpdateItemInput | Item |
| `item::delete` | `item_delete` | id | () |
| `item::get` | `item_get` | id | Item \| null |
| `item::search` | `item_search` | query, SearchOptions | ItemSearchResult[] |
| `item::launch` | `item_launch` | id | LaunchResult |
| `item::import_icon` | `item_import_icon` | exe_path | string (icon_path) |
| `category::list` | `category_list` | - | Category[] |
| `category::create` | `category_create` | CreateCategoryInput | Category |
| `tag::list` | `tag_list` | - | Tag[] |
| `tag::create` | `tag_create` | CreateTagInput | Tag |
| `log::recent` | `log_recent` | limit | LaunchLogEntry[] |
| `log::frequent` | `log_frequent` | limit | LaunchLogEntry[] |
| `config::get` | `config_get` | key | string \| null |
| `config::set` | `config_set` | key, value | () |
| `data::export` | `data_export` | path | () |
| `data::import` | `data_import` | path | () |
| `setup::get_status` | `setup_get_status` | - | SetupStatus |
| `setup::complete` | `setup_complete` | SetupInput | () |
| `visibility::toggle` | `visibility_toggle` | password? | boolean |

#### Events（Backend → Frontend、fire-and-forget）

| イベント | ペイロード | 用途 |
|---|---|---|
| `hotkey-triggered` | - | グローバルホットキー押下 |
| `item-launched` | item_id, timestamp | 起動通知 |
| `tray-action` | action | トレイメニュー操作 |

#### Frontend IPC ラッパー

```typescript
// src/lib/ipc/items.ts — invoke を直接呼ばず型付きラッパーを使用
// invoke名はRust側の関数名と一致（アンダースコア区切り）
import { invoke } from '@tauri-apps/api/core';
import type { Item, CreateItemInput, AppError } from '$lib/types';

export async function createItem(input: CreateItemInput): Promise<Item> {
  return invoke('item_create', { input });
}

export async function searchItems(query: string): Promise<Item[]> {
  return invoke('item_search', { query });
}

// エラーハンドリング: IPCラッパーで catch し、トースト通知で表示
export async function launchItem(id: string): Promise<void> {
  return invoke('item_launch', { id });
}
```

### 2.6 State 管理

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

**パターン**: クラスの `$state` フィールド + `$derived` ゲッター。シングルトンインスタンスをエクスポート。

### 2.7 rusqlite Connection管理

`rusqlite::Connection` は `Send` だが `Sync` ではないため、スレッド間共有に制約がある。

```rust
// Tauri managed state として Mutex<Connection> を保持
use std::sync::Mutex;

pub struct DbState(pub Mutex<rusqlite::Connection>);

// lib.rs での登録
app.manage(DbState(Mutex::new(connection)));

// Command ハンドラでの使用
#[tauri::command]
fn item_search(db: State<DbState>, query: String) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    // ...
}
```

**方針**: M1のアイテム数（数百件以下）・同時リクエスト数（1ユーザー）では `Mutex<Connection>` で十分。将来的に並行性が問題になった場合は `r2d2-sqlite` コネクションプールへの移行パスがある。

### 2.8 エラーハンドリング戦略

#### エラー型

```rust
// src-tauri/src/utils/error.rs
use thiserror::Error;

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

// Tauri IPC でフロントエンドに返すための変換
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}
```

#### エラー伝播パターン

```
Repository (rusqlite::Error) → Service (AppError) → Command (Result<T, AppError>) → Frontend
```

- Repository層: `rusqlite::Error` を `AppError::Database` に自動変換（`From` impl）
- Service層: ビジネスロジック固有のエラー（`NotFound`, `Validation`）を生成
- Command層: `Result<T, AppError>` をそのまま返す。Tauriが `Serialize` 経由でフロントエンドに伝達
- Frontend: IPCラッパーで `catch` し、トースト通知（shadcn-svelteの `Sonner` コンポーネント）で表示

### 2.9 パスワード可視性トグル

`visibility::toggle` のパスワードはカジュアルな隠蔽用途（暗号学的保護ではない）。

- パスワードハッシュは `argon2` でハッシュ化し `config` テーブルに保存
- セッション中はメモリ上のフラグでトグル状態を管理
- 試行回数制限なし（個人用途のため）
- パスワード未設定の場合はホットキーのみでトグル可能

## 3. 非機能要求

| 要求 | 目標値 | 技術的アプローチ |
|---|---|---|
| 常駐メモリ | Idle時 Working Set 100MB以下 | Tauri v2（Electron比で大幅に軽量）+ rusqlite bundled |
| 起動レイテンシ | ホットキー→UI表示 P95 2秒以内 | Tauri IPC (custom protocol) + SQLite WALモード + インデックス最適化 |
| バイナリサイズ | 単体exe 20MB以下 | Tauri v2 + bundled SQLite。SvelteKitの小さいバンドルサイズ |
| データ保存 | ローカル完結 | SQLite（クラウド同期なし） |
| CSP | Tauri v2デフォルトCSP準拠 | `ipc:` / `asset:` スキームのみ許可。`unsafe-inline` / `unsafe-eval` 禁止。外部通信はM1では不要（発生時に個別ホワイトリスト） |

### SQLite PRAGMAs

```sql
PRAGMA journal_mode = WAL;       -- Write-Ahead Logging: 読み書き並行性向上
PRAGMA foreign_keys = ON;        -- 外部キー制約を有効化
PRAGMA busy_timeout = 5000;      -- ロック競合時 最大5秒待機
PRAGMA synchronous = NORMAL;     -- WALモードでの安全性とパフォーマンスのバランス
PRAGMA cache_size = -8000;       -- 8MB ページキャッシュ
```

## 4. SQLiteスキーマ（M1）

M1で使用するテーブルのみ定義。M2以降は段階的にマイグレーションで追加する。

```sql
-- 001_initial.sql

-- アプリケーション設定 (key-value)
CREATE TABLE config (
    key         TEXT    PRIMARY KEY,
    value       TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 統一アイテムモデル
CREATE TABLE items (
    id          TEXT    PRIMARY KEY,  -- UUID v7
    item_type   TEXT    NOT NULL,     -- 'exe' | 'url' | 'folder' | 'script' | 'command'
    label       TEXT    NOT NULL,
    target      TEXT    NOT NULL,     -- 実行パス / URL / フォルダパス / スクリプトパス / コマンド文字列
    args        TEXT,                 -- 起動引数
    working_dir TEXT,                 -- 作業ディレクトリ
    icon_path   TEXT,                 -- アイコンファイルパス (app_data_dir/icons/{id}.png)
    icon_type   TEXT,                 -- 'png' | 'ico' | 'svg'
    aliases     TEXT,                 -- JSON配列: ["blen3", "blender3"]
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_enabled  INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_label ON items(label COLLATE NOCASE);
CREATE INDEX idx_items_enabled ON items(is_enabled);

-- カテゴリ
CREATE TABLE categories (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    prefix      TEXT    UNIQUE,       -- 名前空間プレフィックス (M2a用、例: "gm")
    icon        TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- アイテム-カテゴリ関連 (多対多)
CREATE TABLE item_categories (
    item_id     TEXT    NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    category_id TEXT    NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, category_id)
);

-- タグ
CREATE TABLE tags (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    is_hidden   INTEGER NOT NULL DEFAULT 0,  -- センシティブコンテンツ隠蔽フラグ
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- アイテム-タグ関連 (多対多)
CREATE TABLE item_tags (
    item_id     TEXT    NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id      TEXT    NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

-- 起動ログ
CREATE TABLE launch_log (
    id          TEXT    PRIMARY KEY,
    item_id     TEXT    NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    launched_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    launch_source TEXT  NOT NULL DEFAULT 'palette'  -- 'palette' | 'tray' | 'cli' | 'mcp'
);

CREATE INDEX idx_launch_log_item ON launch_log(item_id);
CREATE INDEX idx_launch_log_time ON launch_log(launched_at DESC);

-- 起動統計 (denormalized)
CREATE TABLE item_stats (
    item_id         TEXT    PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    launch_count    INTEGER NOT NULL DEFAULT 0,
    last_launched_at TEXT
);
```

### スキーマ設計方針

| 決定 | 理由 |
|---|---|
| UUID v7 をIDに使用 | 時刻ソート可能。インポート/エクスポート時のID衝突回避 |
| ISO 8601テキストでタイムスタンプ | SQLiteにネイティブdatetimeなし。TEXTはソート可能・可読性あり |
| `aliases` をJSON配列で格納 | 1アイテムあたり1〜5件程度。別テーブルより簡潔。`json_each()` でクエリ可能。アイテム数が1000件を超えた場合は `item_aliases` テーブルへの正規化を検討 |
| アイコンをファイルシステムに格納 | base64 TEXT比で33%の容量削減。検索クエリでアイコンデータをロードしない。`app_data_dir/icons/` に保存しパスのみDBに保持 |
| `item_stats` テーブルで非正規化 | 検索のたびに `COUNT(*)` を避ける。Service層またはトリガーで更新 |
| `ON DELETE CASCADE` | 参照整合性を保証。`PRAGMA foreign_keys = ON` で有効化 |
| M2+テーブルは未作成 | 仕様変更を想定し、必要になった時点でマイグレーションで追加 |

## 5. 用語集

| 用語 | 定義 |
|---|---|
| アイテム (Item) | Arcagateに登録された起動対象。exe / URL / フォルダ / スクリプト / コマンドの5種類 |
| コマンドパレット | キーボード中心の検索・起動UI。Arcagateのコアインターフェース |
| ワークスペース | ウィジェットを自由配置できるカスタムページ（M2b） |
| Service Layer | ビジネスロジックの集約層。UI / CLI / MCP すべてがここを経由 |
| Plugin Interface | M2以降でプラグインが実装するtrait群。M1では定義のみ |
| ItemProvider | アイテムを外部ソースから提供するプラグインtrait（例: Steamライブラリ） |
| CommandProvider | コマンドパレットに独自コマンドを追加するプラグインtrait |
