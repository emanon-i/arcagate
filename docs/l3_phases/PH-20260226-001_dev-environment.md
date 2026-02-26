---
status: draft
phase_id: PH-20260226-001
title: 開発環境構築
depends_on: []
---

# PH-20260226-001: 開発環境構築

## 目的

プロジェクトの開発基盤を整備し、品質を維持した開発を開始できる状態にする。コードベースの一貫性を保つリンター・フォーマッター、CIによる自動品質チェック、DBマイグレーション基盤を含む。

## 機能一覧

| 機能ID | 機能名 | 対応REQ |
|---|---|---|
| F-20260226-001 | Tauri v2 + SvelteKit プロジェクト初期化 | — |
| F-20260226-002 | リンター・フォーマッター整備 | — |
| F-20260226-003 | CI/CD パイプライン構築 | — |
| F-20260226-004 | SQLite スキーマ・マイグレーション基盤 | — |

## 機能詳細

### F-20260226-001: Tauri v2 + SvelteKit プロジェクト初期化

L2で定義された技術スタックに基づき、Tauri v2 + SvelteKit + Svelte 5 のプロジェクト骨格を構築する。

**技術要素**:
- Tauri v2 (latest stable)
- SvelteKit + `@sveltejs/adapter-static` (Svelte 5, runes)
- Tailwind CSS v4
- shadcn-svelte (Svelte 5 + Tailwind v4 対応版)
- pnpm (パッケージマネージャ)

**受け入れ条件**:
- [ ] `pnpm tauri dev` でTauri v2アプリが起動し、SvelteKitのデフォルトページが表示される
- [ ] Svelte 5 runes (`$state`, `$derived`) がコンパイル・動作する
- [ ] Tailwind CSS v4 のユーティリティクラスが適用される
- [ ] shadcn-svelte の `Button` コンポーネントを追加して表示できる
- [ ] L2のディレクトリ構成に従ったフォルダ構造が作成されている（`src/lib/components/`, `src/lib/ipc/`, `src/lib/state/`, `src-tauri/src/commands/`, `src-tauri/src/services/`, `src-tauri/src/repositories/`, `src-tauri/src/models/`, `src-tauri/src/plugin_api/`, `src-tauri/src/watcher/`, `src-tauri/src/launcher/`, `src-tauri/src/db/`, `src-tauri/src/utils/`）

### F-20260226-002: リンター・フォーマッター整備

フロントエンド・バックエンド双方のコード品質を自動で維持する仕組みを導入する。

**技術要素**:
- フロントエンド + Markdown: Biome（lint + format）
- バックエンド: clippy + rustfmt
- Git hooks（推奨: lefthook または lint-staged）

**受け入れ条件**:
- [ ] `biome check` でフロントエンド（TS/Svelte）の lint + format チェックが実行される
- [ ] `biome format` で Markdown（`docs/**/*.md`, `*.md`）のフォーマットチェックが実行される
- [ ] `cargo clippy` でRustコードの静的解析が通る（warning = deny）
- [ ] `cargo fmt --check` でRustコードのフォーマットチェックが通る
- [ ] Biome の設定ファイル（`biome.json`）がプロジェクトルートに存在し、Markdown が対象に含まれている

### F-20260226-003: CI/CD パイプライン構築

GitHub Actionsで lint・test・build を自動実行するワークフローを構築する。

**技術要素**:
- GitHub Actions
- Rust toolchain setup
- pnpm setup
- Tauri build (Windows)

**受け入れ条件**:
- [ ] PR作成・push時にGitHub Actionsワークフローが自動実行される
- [ ] ワークフローでフロントエンド + Markdown lint/format（Biome）が実行される
- [ ] ワークフローでバックエンド lint（clippy）+ format check（rustfmt）が実行される
- [ ] ワークフローで `cargo test` が実行される
- [ ] ワークフローで `pnpm tauri build` が成功する（Windows環境）

### F-20260226-004: SQLite スキーマ・マイグレーション基盤

L2で定義された初期スキーマ（`001_initial.sql`）を `rusqlite_migration` で適用する基盤と、将来のプラグイン拡張に向けたtrait定義を整備する。

**技術要素**:
- rusqlite (`bundled` feature)
- rusqlite_migration
- L2定義のSQLite PRAGMAs（WAL, foreign_keys, busy_timeout, synchronous, cache_size）
- Plugin trait / FileWatcher trait（定義のみ）

**受け入れ条件**:
- [ ] アプリ起動時に `rusqlite_migration` が `001_initial.sql`（L2 §4のスキーマ）を自動適用する
- [ ] L2定義のPRAGMAs（WAL, foreign_keys ON, busy_timeout 5000, synchronous NORMAL, cache_size -8000）が設定される
- [ ] `Mutex<Connection>` を Tauri managed state として登録し、コマンドハンドラからアクセスできる
- [ ] `plugin_api/` に `ItemProvider`, `CommandProvider`, `Plugin` trait が定義され、コンパイルが通る（実装なし）
- [ ] `watcher/` に `FileWatcher` trait が定義され、コンパイルが通る（実装なし）

## Exit Criteria

- `pnpm tauri dev` でアプリが正常に起動する
- フロントエンド + Markdown（Biome）・バックエンド（clippy + rustfmt）のリンター/フォーマッターが設定済みで、CI上でも実行される
- GitHub Actionsで lint + test + build が自動実行され、全ステップがグリーンである
- SQLiteの初期スキーマが起動時に自動適用される
- プラグインtrait・ファイル監視traitがコンパイル通る状態で定義されている

## 依存関係

- なし（最初のフェーズ）

## 参照ドキュメント

- L2 Foundation: `docs/l2_foundation/foundation.md` §1（技術スタック）, §2.2（ディレクトリ構成）, §3（非機能要求）, §4（SQLiteスキーマ）
