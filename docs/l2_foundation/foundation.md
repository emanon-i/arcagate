# Arcagate システム構成

## 1. 技術スタック

### 1.1 デスクトップフレームワーク

| 項目           | 選定                         |
| -------------- | ---------------------------- |
| フレームワーク | **Tauri v2** (latest stable) |

選定理由: IPC カスタムプロトコルで高速、細粒度 capabilities/scopes、Tauri v1 はメンテナンスモード。

#### Tauri v2 プラグイン一覧

| プラグイン                     | 用途                            |
| ------------------------------ | ------------------------------- |
| `tauri-plugin-global-shortcut` | グローバルホットキー            |
| tray-icon (built-in feature)   | システムトレイ常駐              |
| `tauri-plugin-dialog`          | ファイル選択ダイアログ          |
| `tauri-plugin-shell`           | 外部プロセス起動                |
| `tauri-plugin-autostart`       | Windows 起動時の自動起動        |
| `tauri-plugin-fs`              | ファイルシステムアクセス（D&D） |

### 1.2 フロントエンド

| 項目                 | 選定                                                             |
| -------------------- | ---------------------------------------------------------------- |
| フレームワーク       | **SvelteKit** + `@sveltejs/adapter-static` (**Svelte 5**, runes) |
| CSS                  | **Tailwind CSS v4**                                              |
| UI コンポーネント    | **shadcn-svelte** (Svelte 5 + Tailwind v4 対応版)                |
| 状態管理             | Svelte 5 runes ($state, $derived) — 外部ライブラリ不要           |
| パッケージマネージャ | **pnpm**                                                         |

SvelteKit + adapter-static: SPA 出力（index.html + JS/CSS）、SSR サーバー不要、Tauri v2 公式サポート。Svelte 5: runes による明示的リアクティビティ。shadcn-svelte: コード所有型（外部ランタイム依存なし）、CSS 変数ベーステーマ。

### 1.3 バックエンド

| 項目               | 選定                             |
| ------------------ | -------------------------------- |
| 言語               | **Rust** (stable toolchain)      |
| SQLite アクセス    | **rusqlite** (`bundled` feature) |
| マイグレーション   | **rusqlite_migration**           |
| ID 生成            | **UUID v7** (`uuid` crate)       |
| エラー型導出       | **thiserror**                    |
| パスワードハッシュ | **argon2**                       |

rusqlite: SQLite 専用軽量ラッパー、`bundled` feature でシステム依存ゼロ。UUID v7: 時刻ソート可能、グローバル一意。ORM 不採用（rusqlite + 生 SQL）。

### 1.4 テスト

| レイヤー              | ツール                             |
| --------------------- | ---------------------------------- |
| Rust ユニットテスト   | `cargo test`                       |
| Svelte コンポーネント | vitest + `@testing-library/svelte` |
| E2E（デスクトップ）   | **Playwright**（CDP/WebView2）     |

---

## 2. アーキテクチャ overview

```
┌──────────────────────────────────────────────────────────┐
│                 FRONTEND (SvelteKit SPA / Svelte 5)       │
│                                                           │
│  ┌────────────┐  ┌───────────┐  ┌───────────────────┐    │
│  │ Command    │  │ Settings  │  │ Workspace         │    │
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
│  │   #[tauri::command] — 引数パース → Service 呼び出し  │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Service Layer (ビジネスロジック)            │  │
│  │   ItemService, LaunchService, ConfigService,         │  │
│  │   ThemeService, WorkspaceService                     │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           Repository Layer (データアクセス)           │  │
│  │   ItemRepo, TagRepo, LogRepo, ConfigRepo,             │  │
│  │   ThemeRepo, WatchedPathRepo, WorkspaceRepo           │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │                 SQLite (rusqlite)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

設計原則: UI は Service Layer を経由する。レイヤー逆方向禁止（`commands → services → repositories → DB`）。

---

## 3. 非機能要求

| 要求           | 目標値                         | 技術的アプローチ                                                 |
| -------------- | ------------------------------ | ---------------------------------------------------------------- |
| 常駐メモリ     | Idle 時 Working Set 120MB 以下 | Tauri v2 + rusqlite bundled                                      |
| 起動レイテンシ | P95 2,500ms 以内               | Tauri IPC (custom protocol) + SQLite WAL + インデックス最適化    |
| バイナリサイズ | 単体 exe 20MB 以下             | Tauri v2 + bundled SQLite                                        |
| データ保存     | ローカル完結                   | SQLite（クラウド同期なし）                                       |
| CSP            | Tauri v2 デフォルト CSP 準拠   | `ipc:` / `asset:` のみ許可、`unsafe-inline` / `unsafe-eval` 禁止 |

### SQLite PRAGMAs

```sql
PRAGMA journal_mode = WAL;       -- 読み書き並行性向上
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;      -- ロック競合時 最大 5 秒待機
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -8000;       -- 8MB ページキャッシュ
```

---

## 4. CI/CD

| ワークフロー | ファイル                        | 概要                                                                                     |
| ------------ | ------------------------------- | ---------------------------------------------------------------------------------------- |
| CI           | `.github/workflows/ci.yml`      | biome / dprint / clippy / rustfmt / svelte-check / cargo test / vitest / lefthook audits |
| Release      | `.github/workflows/release.yml` | tag push → Tauri build + tauri signer (Tier 1) + cosign sign-blob (Tier 2)               |

E2E ワークフロー（e2e.yml / e2e-nightly.yml）は PR-Z で削除済。T1-T4 plan で incremental 再構築中（`docs/l1_requirements/test-rebuild/` 参照）。

---

## 5. 用語集

| 用語             | 定義                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| アイテム (Item)  | Arcagate に登録された起動対象。exe / URL / フォルダ / スクリプト / コマンドの 5 種類 |
| コマンドパレット | キーボード中心の検索・起動 UI。Arcagate のコアインターフェース                       |
| ワークスペース   | ウィジェットを自由配置できるカスタムページ                                           |
| Service Layer    | ビジネスロジックの集約層。UI / CLI すべてがここを経由                                |
| Plugin Interface | 将来プラグインが実装する trait 群。現在は trait 定義のみ                             |
| ItemProvider     | アイテムを外部ソースから提供するプラグイン trait（例: Steam ライブラリ）             |
| CommandProvider  | コマンドパレットに独自コマンドを追加するプラグイン trait                             |

---

詳細は以下の partner file 参照:

| ファイル                     | 内容                                           |
| ---------------------------- | ---------------------------------------------- |
| `foundation-architecture.md` | Service Layer / IPC 設計 / State 管理 / エラー |
| `foundation-schema.md`       | SQLite スキーマ（22 migrations）               |
| `foundation-dirs.md`         | ディレクトリ構成                               |
| `engineering-principles.md`  | 技術判断基準 / IPC コマンド全列挙              |
