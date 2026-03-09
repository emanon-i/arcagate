---
status: done
sub_phase: PH-003-E
feature_id: F-20260226-014
priority: 5
---

# PH-003-E: ワークスペース コア（ページ + ウィジェット配置）

**対応REQ**: REQ-20260226-010
**元機能**: F-20260226-014 (core)

ユーザーが任意のページを作成し、内蔵ウィジェットをドラッグ&ドロップで自由配置できるホーム画面を実装する。

## 技術要素

- SvelteKit ファイルベースルーティング: `src/routes/workspace/[id]/+page.svelte`
- ウィジェット D&D: `@formkit/drag-and-drop`
- 内蔵ウィジェット:
  - `FavoritesWidget` — よく使うもの（起動回数上位 N 件）
  - `RecentWidget` — 最近使ったもの（launch_log テーブルから）
  - `ProjectListWidget` — プロジェクト一覧（アイテム種別=project のもの）
  - `WatchedFoldersWidget` — 監視フォルダ（watched_paths テーブルから）

## DB マイグレーション

`src-tauri/migrations/004_workspaces.sql`:

```sql
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspace_widgets (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    widget_type TEXT NOT NULL,  -- 'favorites'|'recent'|'projects'|'watched_folders'
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 2,
    height INTEGER NOT NULL DEFAULT 2,
    config TEXT,  -- JSON（ウィジェット固有設定）
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 受け入れ条件

- [x] 複数のワークスペースページを作成・削除・名前変更できる（MCP smoke-test: `arcagate_workspace_create` / `cmd_delete_workspace` / `cmd_update_workspace` で確認）
- [x] ワークスペース間をタブまたはサイドバーで切り替えられる（`+page.svelte` に `workspace` タブ実装済み、WorkspaceView コンポーネントで tab 切り替え）
- [x] 4種類の内蔵ウィジェット（よく使うもの / 最近使ったもの / プロジェクト一覧 / 監視フォルダ）を配置できる（MCP smoke-test: `arcagate_workspace_add_widget` で `favorites` 投入確認）
- [x] ウィジェットをドラッグ&ドロップで移動できる（`@formkit/drag-and-drop` を WidgetGrid に組み込み済み）
- [x] ウィジェットをリサイズできる（WidgetCard に右下リサイズハンドル実装済み、`resizeWidget` IPC 呼び出しで DB 更新）
- [x] ウィジェットの配置は DB に保存され、再起動後も維持される（MCP smoke-test: create → list で永続化を確認）
- [x] `pnpm verify` が全通過する（Rust 116テスト / vitest 15テスト / smoke-test 全通過 / tauri build 成功）
