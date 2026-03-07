---
status: done
phase_id: PH-003-N
depends_on:
  - PH-003-I
---

# PH-003-N: カテゴリ → タグ統一

## 概要

現在併存しているカテゴリとタグを統一し、タグのみのシステムに移行する。
ワークスペース名を自動タグとして付与する機能も実装する。
DB マイグレーション + 全レイヤー（Repository → Service → Command → Frontend）の変更が必要な大型リファクタリング。

PH-003-I（サイドバー変更）完了後に着手する。サイドバーがアイコンのみに変更された後に、カテゴリベースのナビゲーションをタグベースに移行するため。

---

## N-1: カテゴリ廃止・タグ統一マイグレーション

### 背景

現在の DB スキーマ:

- `categories` テーブル: id, name, prefix, icon, sort_order, created_at
- `item_categories` ジャンクションテーブル: item_id, category_id
- `tags` テーブル: id, name, is_hidden, created_at
- `item_tags` ジャンクションテーブル: item_id, tag_id

フィードバック: 「カテゴリ廃止、タグに統一。ワークスペース名を自動タグ付与。」

### マイグレーション戦略

1. 既存カテゴリを同名のタグとして移行（重複チェック）
2. `item_categories` の関連を `item_tags` に移行
3. `categories` / `item_categories` テーブルを DROP
4. `tags` テーブルに `is_auto` フラグ追加（ワークスペース自動タグ識別用）
5. `prefix` 機能は CLI のカテゴリプレフィックス（PH-003-B）で使用されていたため、タグに `prefix` カラムを追加するか、別の仕組みで対応

### 受け入れ条件

- [x] マイグレーション SQL が作成される（`src-tauri/migrations/` 配下）
- [x] 既存カテゴリデータがタグに移行される（データロスなし）
- [x] `item_categories` の関連が `item_tags` に移行される
- [x] `categories` / `item_categories` テーブルが削除される
- [x] `tags` テーブルに `is_auto` カラムが追加される
- [x] `tags` テーブルに `prefix` カラムが追加される（CLI プレフィックス用）
- [x] マイグレーション前後のデータ整合性テストが通過する
- [x] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                       | 変更内容                    |
| ---------------------------------------------- | --------------------------- |
| `src-tauri/migrations/XXX_category_to_tag.sql` | 新規 — マイグレーション SQL |
| `src-tauri/src/db/mod.rs`                      | マイグレーション登録        |

### バックエンド変更

| ファイル                                            | 変更内容                                              |
| --------------------------------------------------- | ----------------------------------------------------- |
| `src-tauri/src/models/category.rs`                  | 削除                                                  |
| `src-tauri/src/models/tag.rs`                       | `is_auto`, `prefix` フィールド追加                    |
| `src-tauri/src/models/mod.rs`                       | category モジュール削除                               |
| `src-tauri/src/repositories/category_repository.rs` | 削除                                                  |
| `src-tauri/src/repositories/tag_repository.rs`      | カテゴリ相当の機能を吸収（`find_all_with_counts` 等） |
| `src-tauri/src/repositories/mod.rs`                 | category_repository モジュール削除                    |
| `src-tauri/src/services/item_service.rs`            | カテゴリ関連メソッド削除、タグメソッドに統合          |
| `src-tauri/src/commands/item_commands.rs`           | カテゴリ関連コマンド削除、タグコマンドに統合          |
| `src-tauri/src/lib.rs`                              | Tauri コマンド登録からカテゴリコマンド削除            |

### フロントエンド変更

| ファイル                                                     | 変更内容                                          |
| ------------------------------------------------------------ | ------------------------------------------------- |
| `src/lib/types/category.ts`                                  | 削除                                              |
| `src/lib/types/tag.ts`                                       | `is_auto`, `prefix` フィールド追加                |
| `src/lib/ipc/items.ts`                                       | カテゴリ関連 IPC 削除、タグ IPC に統合            |
| `src/lib/components/item/CategoryManager.svelte`             | 削除                                              |
| `src/lib/components/item/TagManager.svelte`                  | カテゴリ管理機能を吸収                            |
| `src/lib/components/item/ItemForm.svelte`                    | カテゴリ選択 UI → タグ選択 UI に変更              |
| `src/lib/components/arcagate/library/LibrarySidebar.svelte`  | カテゴリベースのフィルタ → タグベースに変更       |
| `src/lib/components/arcagate/library/LibraryMainArea.svelte` | カテゴリフィルタ → タグフィルタに変更             |
| `src/lib/components/arcagate/palette/`                       | カテゴリプレフィックス → タグプレフィックスに変更 |

### CLI 変更

| ファイル             | 変更内容                                                  |
| -------------------- | --------------------------------------------------------- |
| `src-tauri/src/cli/` | カテゴリプレフィックスコマンド → タグプレフィックスに変更 |

### ワークスペース自動タグ付与

| ファイル                                      | 変更内容                                                       |
| --------------------------------------------- | -------------------------------------------------------------- |
| `src-tauri/src/services/workspace_service.rs` | ワークスペース作成時に同名の自動タグ（`is_auto = true`）を作成 |
| `src-tauri/src/services/item_service.rs`      | ワークスペースにアイテム追加時に自動タグを付与                 |

### テスト変更

| ファイル                                            | 変更内容                              |
| --------------------------------------------------- | ------------------------------------- |
| `src-tauri/src/repositories/category_repository.rs` | テスト削除（ファイルごと）            |
| `src-tauri/src/repositories/tag_repository.rs`      | カテゴリ統合分のテスト追加            |
| `src-tauri/src/services/`                           | カテゴリ関連テスト → タグテストに統合 |
| `tests/`                                            | E2E テストのカテゴリ参照をタグに変更  |

---

## Exit Criteria

- [x] `categories` / `item_categories` テーブルが存在しない
- [x] 全てのカテゴリデータがタグに移行済み
- [x] カテゴリ関連の Rust コード（model, repository, service, command）が存在しない
- [x] カテゴリ関連のフロントエンドコード（type, component, IPC）が存在しない
- [x] ワークスペース作成時に自動タグが付与される
- [x] CLI のプレフィックス機能がタグベースで動作する
- [x] LibrarySidebar がタグでフィルタリングする
- [x] 全 Rust テストが通過する（カテゴリテストは削除済み）
- [x] E2E テストが通過する
- [x] `pnpm verify` が全通過
