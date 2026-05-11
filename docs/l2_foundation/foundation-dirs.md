# Foundation: ディレクトリ構成

## モジュール構成（概要）

```mermaid
graph TD
    Root[arcagate/]
    Root --> Src[src/]
    Root --> SrcTauri[src-tauri/]
    Root --> Tests[tests/]
    Root --> Docs[docs/]

    Src --> Routes[routes/ — SvelteKit 画面]
    Src --> Lib[lib/]

    Lib --> Components[components/]
    Lib --> State[state/ — Svelte 5 runes store]
    Lib --> IPC[ipc/ — Tauri invoke wrapper]
    Lib --> Types[types/]
    Lib --> Bindings[bindings/ — ts-rs auto-gen]
    Lib --> Utils[utils/]
    Lib --> Constants[constants/]
    Lib --> Styles[styles/]
    Lib --> Widgets[widgets/ — widget 本体 (folder-per-widget)]

    Components --> Arcagate[arcagate/]
    Components --> Item[item/ — ItemForm 等]
    Components --> Settings[settings/]
    Components --> Setup[setup/ — SetupWizard]
    Components --> UI[ui/ — shadcn-svelte]

    Arcagate --> ArcCommon[common/ — Tip / WidgetShell 等]
    Arcagate --> ArcLibrary[library/]
    Arcagate --> ArcPalette[palette/]
    Arcagate --> ArcWorkspace[workspace/]

    SrcTauri --> SrcRust[src/]
    SrcRust --> Commands[commands/ — Tauri IPC handler]
    SrcRust --> Services[services/ — business logic]
    SrcRust --> Repositories[repositories/ — DB CRUD]
    SrcRust --> Models[models/ — struct/enum]
    SrcRust --> Launcher[launcher/]
    SrcRust --> Watcher[watcher/]
    SrcRust --> Db[db/]
    SrcRust --> RustUtils[utils/]
    SrcRust --> Bin[bin/ — CLI binary]
```

---

## ディレクトリ詳細

```
arcagate/
├── docs/
│   ├── l0_ideas/
│   ├── l1_requirements/
│   ├── l2_foundation/
│   └── l3_phases/
│
├── src/                            # SvelteKit フロントエンド
│   ├── app.html
│   ├── app.css                     # グローバル CSS（Tailwind v4 import）
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn-svelte（手動編集禁止）
│   │   │   ├── arcagate/
│   │   │   │   ├── common/         # Tip / WidgetShell / ItemIcon 等
│   │   │   │   ├── library/        # Library 画面コンポーネント
│   │   │   │   ├── palette/        # Palette overlay
│   │   │   │   └── workspace/      # Workspace shell / canvas
│   │   │   ├── item/               # ItemForm / ItemCard
│   │   │   ├── settings/           # Settings 画面
│   │   │   └── setup/              # 初回セットアップ Wizard
│   │   ├── widgets/                # widget 本体（folder-per-widget 構成）
│   │   │   ├── _shared/            # WidgetShell, 共通型
│   │   │   ├── clock/
│   │   │   ├── exe-folder/
│   │   │   └── ...（全 widget）
│   │   ├── ipc/                    # Tauri IPC 型付きラッパー
│   │   │   ├── items.ts
│   │   │   ├── launch.ts
│   │   │   ├── config.ts
│   │   │   ├── export.ts
│   │   │   ├── theme.ts
│   │   │   ├── watched_paths.ts
│   │   │   └── workspace.ts
│   │   ├── state/                  # グローバルステート (runes)
│   │   │   ├── palette.svelte.ts
│   │   │   ├── items.svelte.ts
│   │   │   ├── config.svelte.ts
│   │   │   ├── hidden.svelte.ts
│   │   │   └── workspace.svelte.ts
│   │   ├── types/                  # TypeScript 型定義
│   │   ├── bindings/               # ts-rs auto-gen（編集禁止）
│   │   ├── constants/
│   │   ├── styles/                 # arcagate-theme.css 等
│   │   └── utils/
│   └── routes/
│       ├── +layout.svelte          # ルートレイアウト（トレイ・ホットキーリスナー）
│       ├── +page.svelte            # メインページ（Library / Workspace / Settings）
│       └── palette/
│           └── +page.svelte        # フローティングコマンドパレット
│
├── src-tauri/                      # Rust バックエンド (Tauri v2)
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── capabilities/
│   ├── icons/
│   ├── migrations/                 # SQLite マイグレーション SQL（001〜22 実装済み）
│   └── src/
│       ├── main.rs                 # エントリーポイント
│       ├── lib.rs                  # Tauri app setup, コマンド登録
│       ├── bin/
│       │   └── arcagate_cli.rs
│       ├── commands/               # Tauri コマンドハンドラ（thin layer）
│       ├── services/               # ビジネスロジック
│       ├── repositories/           # データアクセス (rusqlite)
│       ├── models/                 # ドメインモデル・DTO
│       ├── plugin_api/             # プラグイン trait 定義
│       ├── watcher/                # notify クレートによる FS 監視
│       ├── launcher/               # プロセス起動ロジック
│       ├── db/                     # DB 初期化・マイグレーション
│       └── utils/                  # error / icon 等
│
├── tests/                          # Playwright E2E テスト
│   ├── fixtures/
│   │   ├── global-setup.ts
│   │   ├── global-teardown.ts
│   │   └── tauri.ts
│   ├── helpers/
│   │   └── ipc.ts
│   └── e2e/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── package.json
├── pnpm-lock.yaml
├── playwright.config.ts
├── svelte.config.js
├── vite.config.ts
└── CLAUDE.md
```

---

## ディレクトリ設計の要点

| ディレクトリ                | 設計意図                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `src/lib/ipc/`              | `invoke` を直接呼ばない。型付きラッパー経由で TypeScript 型安全性を確保                       |
| `src/lib/state/`            | `.svelte.ts` 拡張子でコンポーネント外から runes を使用（Svelte 5 推奨パターン）               |
| `src/lib/widgets/`          | folder-per-widget 構成。widget 本体 / 設定 / index.ts を同一ディレクトリにまとめる            |
| `src-tauri/migrations/`     | SQL ファイルを `include_str!` でバイナリに埋め込み。実行時ファイル依存なし                    |
| `src-tauri/src/plugin_api/` | trait 定義のみ。将来のプラグインローディング追加時のリファクタを防止                          |
| `src-tauri/src/watcher/`    | `notify` クレートによる FS 監視。バックグラウンドスレッドが変更を検知しフロントへイベント送信 |
