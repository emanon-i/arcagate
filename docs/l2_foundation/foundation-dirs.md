# Foundation §2.2: ディレクトリ構成

[foundation.md](./foundation.md) / [foundation-architecture.md](./foundation-architecture.md) の続編。

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
│   │   │   ├── settings/           # 設定画面（HotkeyInput / AutostartToggle / WatchedPathsManager 等）
│   │   │   ├── workspace/          # ワークスペース (PH-003-E)
│   │   │   │   ├── WorkspaceView.svelte
│   │   │   │   ├── WidgetGrid.svelte
│   │   │   │   ├── WidgetCard.svelte
│   │   │   │   ├── AddWidgetDialog.svelte
│   │   │   │   ├── FavoritesWidget.svelte
│   │   │   │   ├── RecentWidget.svelte
│   │   │   │   ├── ProjectListWidget.svelte
│   │   │   │   └── WatchedFoldersWidget.svelte
│   │   │   └── setup/              # セットアップウィザード (REQ-006)
│   │   ├── ipc/                    # Tauri IPC 型付きラッパー
│   │   │   ├── items.ts
│   │   │   ├── launch.ts
│   │   │   ├── config.ts
│   │   │   ├── export.ts
│   │   │   ├── theme.ts            # PH-003-F
│   │   │   ├── watched_paths.ts    # PH-003-D
│   │   │   └── workspace.ts        # PH-003-E
│   │   ├── state/                  # グローバルステート (runes)
│   │   │   ├── palette.svelte.ts
│   │   │   ├── items.svelte.ts
│   │   │   ├── config.svelte.ts
│   │   │   ├── hidden.svelte.ts
│   │   │   └── workspace.svelte.ts # PH-003-E
│   │   ├── types/                  # TypeScript 型定義
│   │   │   ├── item.ts
│   │   │   ├── tag.ts
│   │   │   ├── palette.ts
│   │   │   ├── theme.ts            # PH-003-F
│   │   │   ├── git.ts              # PH-003-F
│   │   │   ├── workspace.ts        # PH-003-E
│   │   │   └── watched_path.ts     # PH-003-D
│   │   └── utils/                  # ユーティリティ
│   └── routes/                     # SvelteKit ファイルベースルーティング
│       ├── +layout.svelte          # ルートレイアウト（トレイ・ホットキーリスナー）
│       ├── +page.svelte            # メインページ（Library / Workspace / Settings）
│       └── palette/
│           └── +page.svelte        # フローティングコマンドパレット (PH-003-F)
│
├── src-tauri/                      # Rust バックエンド (Tauri v2)
│   ├── Cargo.toml                  # [default-run = "arcagate"] + [[bin]] arcagate_cli
│   ├── build.rs                    # Tauri ビルドスクリプト
│   ├── tauri.conf.json             # Tauri 設定
│   ├── capabilities/               # Tauri v2 パーミッション定義
│   │   └── default.json
│   ├── icons/                      # アプリアイコン
│   ├── migrations/                 # SQLite マイグレーション SQL（001〜010 実装済み）
│   │   ├── 001_initial.sql
│   │   ├── 002_mcp_permissions.sql             # → 007 で DROP 済み
│   │   ├── 003_watched_paths.sql
│   │   ├── 004_workspaces.sql
│   │   ├── 005_mcp_workspace_permissions.sql   # → 007 で DROP 済み
│   │   ├── 006_themes.sql                      # テーマ CRUD（PH-003-F）
│   │   ├── 007_drop_mcp_permissions.sql        # MCP 除去（PH-003-H）
│   │   ├── 008_category_to_tag.sql             # カテゴリ → タグ統一（PH-003-N）
│   │   ├── 009_add_is_tracked.sql              # items.is_tracked 追加（PH-003-M）
│   │   └── 010_folder_default_app.sql          # items.default_app 追加（PH-003-M）
│   └── src/
│       ├── main.rs                 # エントリーポイント (Windows: コンソール非表示)
│       ├── lib.rs                  # Tauri app setup, コマンド登録
│       ├── bin/
│       │   └── arcagate_cli.rs     # CLI エントリーポイント (PH-003-A)
│       ├── commands/               # Tauri コマンドハンドラ (thin layer)
│       │   ├── mod.rs
│       │   ├── item_commands.rs
│       │   ├── launch_commands.rs
│       │   ├── config_commands.rs
│       │   ├── export_commands.rs
│       │   ├── theme_commands.rs         # PH-003-F
│       │   ├── watched_path_commands.rs  # PH-003-D
│       │   └── workspace_commands.rs     # PH-003-E
│       ├── services/               # ビジネスロジック
│       │   ├── mod.rs
│       │   ├── item_service.rs
│       │   ├── launch_service.rs
│       │   ├── config_service.rs
│       │   ├── export_service.rs
│       │   ├── theme_service.rs          # PH-003-F
│       │   ├── watched_path_service.rs   # PH-003-D
│       │   └── workspace_service.rs      # PH-003-E
│       ├── repositories/           # データアクセス (rusqlite)
│       │   ├── mod.rs
│       │   ├── item_repository.rs
│       │   ├── tag_repository.rs
│       │   ├── launch_repository.rs
│       │   ├── config_repository.rs
│       │   ├── theme_repository.rs         # PH-003-F
│       │   ├── watched_path_repository.rs  # PH-003-D
│       │   └── workspace_repository.rs     # PH-003-E
│       ├── models/                 # ドメインモデル・DTO
│       │   ├── mod.rs
│       │   ├── item.rs
│       │   ├── tag.rs
│       │   ├── launch.rs
│       │   ├── config.rs
│       │   ├── theme.rs            # PH-003-F
│       │   ├── git.rs              # PH-003-F
│       │   ├── watched_path.rs     # PH-003-D
│       │   └── workspace.rs        # PH-003-E
│       ├── plugin_api/             # プラグイン trait 定義 (M1: traitのみ)
│       │   ├── mod.rs
│       │   ├── item_provider.rs
│       │   ├── command_provider.rs
│       │   └── plugin.rs
│       ├── watcher/                # notify クレートによる FS 監視 (PH-003-D)
│       │   ├── mod.rs              # WatcherState / start_watcher / handle_event
│       │   └── traits.rs           # FileWatcher trait
│       ├── launcher/               # プロセス起動ロジック
│       │   └── mod.rs
│       ├── db/                     # DB初期化・マイグレーション
│       │   ├── mod.rs
│       │   └── migrations.rs
│       └── utils/                  # 共有ユーティリティ
│           ├── mod.rs
│           ├── icon.rs             # .exe からのアイコン抽出
│           └── error.rs            # エラー型定義
│
├── tests/                          # Playwright E2E テスト (PH-003-F)
│   ├── fixtures/
│   │   ├── global-setup.ts         # Tauri アプリ起動 + CDP 待機
│   │   ├── global-teardown.ts      # アプリ終了 + テスト用 DB 削除
│   │   └── tauri.ts                # page / context fixture
│   ├── helpers/
│   │   └── ipc.ts                  # page.evaluate 経由 IPC ヘルパー
│   └── e2e/
│       ├── items.spec.ts
│       ├── palette.spec.ts
│       ├── workspace.spec.ts
│       └── settings.spec.ts
│
├── .claude/
│   └── skills/
│       └── e2e-tauri-webview2/     # E2E スキル定義
│
├── .github/
│   └── workflows/
│       └── e2e.yml                 # E2E CI (windows-latest + CDP)
│
├── static/                         # 静的アセット
├── package.json
├── pnpm-lock.yaml
├── playwright.config.ts            # Playwright 設定（WebView2 CDP + webServer）
├── svelte.config.js                # SvelteKit config (static adapter)
├── vite.config.ts
├── tsconfig.json
└── .gitignore                      # (既存)
```

**ディレクトリ設計の要点**:

| ディレクトリ                | 設計意図                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/lib/ipc/`              | フロントエンドは `invoke` を直接呼ばない。型付きラッパー経由でTypeScript型安全性を確保                    |
| `src/lib/state/`            | `.svelte.ts` 拡張子でコンポーネント外からrunesを使用（Svelte 5推奨パターン）                              |
| `src-tauri/migrations/`     | SQLファイルを `include_str!` でバイナリに埋め込み。実行時ファイル依存なし。001〜010 実装済み              |
| `src-tauri/src/plugin_api/` | M1ではtrait定義のみ。M2でプラグインローディングを追加する際のリファクタを防止                             |
| `src/lib/components/setup/` | セットアップウィザード（REQ-006）。初回起動時のみモーダルダイアログとして表示（独立ルートではない）       |
| `src-tauri/src/watcher/`    | `notify` クレートによる FS 監視（PH-003-D）。バックグラウンドスレッドが変更を検知しフロントへイベント送信 |
| `src-tauri/src/bin/`        | `arcagate_cli.rs`（PH-003-A）。`default-run = "arcagate"` で Tauri build との競合を回避                   |
| `src-tauri/src/launcher/`   | プロセス起動ロジックを集約。アイテムタイプ別の起動処理を `mod.rs` で一元管理                              |
| `tests/`                    | Playwright E2E テスト（PH-003-F）。CDP 経由で WebView2 に接続。グローバルセットアップで Tauri 起動        |
