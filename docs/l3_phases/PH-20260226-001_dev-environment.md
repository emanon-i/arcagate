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

| 機能ID         | 機能名                                  | 対応REQ |
| -------------- | --------------------------------------- | ------- |
| F-20260226-001 | Tauri v2 + SvelteKit プロジェクト初期化 | —       |
| F-20260226-002 | リンター・フォーマッター整備            | —       |
| F-20260226-003 | CI/CD パイプライン構築                  | —       |
| F-20260226-004 | SQLite スキーマ・マイグレーション基盤   | —       |
| F-20260226-005 | 自律検証環境の整備                      | —       |

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

- [x] `pnpm tauri dev` でTauri v2アプリが起動し、SvelteKitのデフォルトページが表示される
- [x] Svelte 5 runes (`$state`, `$derived`) がコンパイル・動作する
- [x] Tailwind CSS v4 のユーティリティクラスが適用される
- [x] shadcn-svelte の `Button` コンポーネントを追加して表示できる
- [x] L2のディレクトリ構成に従ったフォルダ構造が作成されている（`src/lib/components/`, `src/lib/ipc/`, `src/lib/state/`, `src-tauri/src/commands/`, `src-tauri/src/services/`, `src-tauri/src/repositories/`, `src-tauri/src/models/`, `src-tauri/src/plugin_api/`, `src-tauri/src/watcher/`, `src-tauri/src/launcher/`, `src-tauri/src/db/`, `src-tauri/src/utils/`）

### F-20260226-002: リンター・フォーマッター整備

フロントエンド・バックエンド双方のコード品質を自動で維持する仕組みを導入する。

**技術要素**:

- フロントエンド: Biome（lint + format）
- Markdown: dprint（format）
- バックエンド: clippy + rustfmt
- Git hooks: lefthook

**受け入れ条件**:

- [x] `biome check` でフロントエンド（TS/Svelte）の lint + format チェックが実行される
- [x] `dprint check` で Markdown（`docs/**/*.md`, `*.md`）のフォーマットチェックが実行される
- [x] `cargo clippy` でRustコードの静的解析が通る（warning = deny）
- [x] `cargo fmt --check` でRustコードのフォーマットチェックが通る
- [x] `dprint.json` がプロジェクトルートに存在し、Markdown プラグインが設定されている

### F-20260226-003: CI/CD パイプライン構築

GitHub Actionsで lint・test・build を自動実行するワークフローを構築する。

**技術要素**:

- GitHub Actions
- Rust toolchain setup
- pnpm setup
- Tauri build (Windows)

**受け入れ条件**:

- [x] PR作成・push時にGitHub Actionsワークフローが自動実行される
- [x] ワークフローでフロントエンド lint/format（Biome）が実行される
- [x] ワークフローで Markdown format（dprint）が実行される
- [x] ワークフローでバックエンド lint（clippy）+ format check（rustfmt）が実行される
- [x] ワークフローで `cargo test` が実行される
- [x] ワークフローで `pnpm tauri build` が成功する（Windows環境）

### F-20260226-004: SQLite スキーマ・マイグレーション基盤

L2で定義された初期スキーマ（`001_initial.sql`）を `rusqlite_migration` で適用する基盤と、将来のプラグイン拡張に向けたtrait定義を整備する。

**技術要素**:

- rusqlite (`bundled` feature)
- rusqlite_migration
- L2定義のSQLite PRAGMAs（WAL, foreign_keys, busy_timeout, synchronous, cache_size）
- Plugin trait / FileWatcher trait（定義のみ）

**受け入れ条件**:

- [x] アプリ起動時に `rusqlite_migration` が `001_initial.sql`（L2 §4のスキーマ）を自動適用する
- [x] L2定義のPRAGMAs（WAL, foreign_keys ON, busy_timeout 5000, synchronous NORMAL, cache_size -8000）が設定される
- [x] `Mutex<Connection>` を Tauri managed state として登録し、コマンドハンドラからアクセスできる
- [x] `plugin_api/` に `ItemProvider`, `CommandProvider`, `Plugin` trait が定義され、コンパイルが通る（実装なし）
- [x] `watcher/` に `FileWatcher` trait が定義され、コンパイルが通る（実装なし）

### F-20260226-005: 自律検証環境の整備

コーディングエージェントが Phase 2 以降で人間の判断を仰がず、単一コマンドで変更の正しさを自己検証できるようにする。

**技術要素**:

- **vitest** + `@testing-library/svelte` の設定（`vitest.config.ts`, テストヘルパー）
  - `@tauri-apps/api/mocks` による IPC モック
  - jsdom 環境で完全ヘッドレス実行
- **cargo test** のテストヘルパー
  - Service/Repository 層を直接テスト（`tauri::test` は Windows バグのため不使用）
  - in-memory SQLite + マイグレーション適用ユーティリティ
- **svelte-check** — TypeScript 型チェック
- **統一検証スクリプト `pnpm verify`** — 以下を順次実行:
  1. `biome check` (フロントエンド lint + format)
  2. `dprint check` (Markdown format)
  3. `cargo clippy -- -D warnings`
  4. `cargo fmt --check`
  5. `pnpm check` (svelte-check)
  6. `cargo test`
  7. `pnpm test` (vitest)
  8. `pnpm tauri build` (ビルド検証)

**受け入れ条件**:

- [x] `pnpm test` で vitest が実行され、サンプルテストが通る
- [x] `cargo test` で Rust テストが実行され、in-memory SQLite ヘルパーを使ったサンプルテストが通る
- [x] `pnpm check` で svelte-check が実行され、型エラーがない
- [x] `pnpm verify` で上記8ステップが順次実行され、全ステップが成功する
- [x] CLAUDE.md に `pnpm verify` の用途・実行タイミング・各ステップの説明が記載されている

**注記（GUI検証について）**:

- E2E テスト（WebdriverIO + tauri-driver）は L2 §1.4 に従い M2+ で導入する
- `tauri::test::mock_builder` は Windows での未解決バグ ([tauri#14723](https://github.com/tauri-apps/tauri/issues/14723)) のため Phase 1 では不使用。Service/Repository 層を Tauri ランタイム非依存でテストする
- 視覚回帰テストは UI デザインが安定した段階で別途検討する
- GUI の表示検証（スクリーンショット・DOM 検査）は Playwright MCP（`.mcp.json`）経由で `http://localhost:5173` に対して実施可能。Tauri IPC を伴う検証は M2+ の E2E テストで対応する

## Exit Criteria

- `pnpm tauri dev` でアプリが正常に起動する
- フロントエンド（Biome）・Markdown（dprint）・バックエンド（clippy + rustfmt）のリンター/フォーマッターが設定済みで、CI上でも実行される
- GitHub Actionsで lint + test + build が自動実行され、全ステップがグリーンである
- SQLiteの初期スキーマが起動時に自動適用される
- プラグインtrait・ファイル監視traitがコンパイル通る状態で定義されている
- `pnpm verify` で全検証（lint → format → type-check → test → build）が一括実行でき、全ステップがグリーンである

## 依存関係

- なし（最初のフェーズ）

## 参照ドキュメント

- L2 Foundation: `docs/l2_foundation/foundation.md` §1（技術スタック）, §2.2（ディレクトリ構成）, §3（非機能要求）, §4（SQLiteスキーマ）
