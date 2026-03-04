---
status: wip
sub_phase: PH-003-F
feature_id: F-20260226-014
priority: 6
---

# PH-003-F: UI リデザイン + テーマ + Git ステータス

**対応REQ**: REQ-20260226-010
**元機能**: F-20260226-014 (ext)
**前提**: PH-003-E 完了

仕様書 `docs/l2_foundation/arcagate-mock-spec.md` に基づき、Arcagate の UI を Library/Workspace 2タブ構造 + Palette オーバーレイに全面刷新する。静的モック → 動的化 → スタイル調整 → テーマ永続化 → Git ステータス表示の順で段階的に進める。

## ステップ構成

| #   | 内容                                                          | 状態    |
| --- | ------------------------------------------------------------- | ------- |
| F-1 | 静的UIモック                                                  | done    |
| F-2 | 動的化（データ配線 + E2Eテスト修正）                          | pending |
| F-3 | スタイル微調整（レスポンシブ・リサイズ対応）                  | pending |
| F-4 | テーマ永続化（DB + カスタムテーマ + インポート/エクスポート） | pending |
| F-5 | Git ステータス表示（監視フォルダ内リポジトリ）                | pending |

---

## F-1: 静的UIモック（done）

既存の4タブUI（items/categories/workspace/settings）を完全置換し、モックデータで見た目を成立させた。将来の配線ポイントは TODO コメントで明示済み。

### 技術要素

- Svelte 5（runes: `$state`, `$props`, `$derived`, Snippet API）
- Tailwind v4 + カスタム CSS 変数（`--ag-*` レイヤー）。shadcn トークンは温存
- shadcn-svelte@next 追加: dropdown-menu, separator, scroll-area, input, tooltip
- `@lucide/svelte` アイコン
- テーマ切替の土台: `document.documentElement.classList` で `.dark` トグル（未永続化）

### 作成ファイル（37ファイル）

| カテゴリ           | 数 | パス                                               |
| ------------------ | -- | -------------------------------------------------- |
| デザイントークン   | 1  | `src/lib/styles/arcagate-theme.css`                |
| モックデータ       | 3  | `src/lib/mock/arcagate/{items,workspace,stats}.ts` |
| 共通コンポーネント | 12 | `src/lib/components/arcagate/common/`              |
| Library 画面       | 7  | `src/lib/components/arcagate/library/`             |
| Workspace 画面     | 9  | `src/lib/components/arcagate/workspace/`           |
| Palette            | 5  | `src/lib/components/arcagate/palette/`             |

### 変更ファイル

- `src/app.css` — `arcagate-theme.css` の import 追加
- `src/routes/+page.svelte` — 4タブ構造を Library/Workspace 2タブ + PaletteOverlay に置換

### 設計判断

| 判断                 | 採用案                            | 理由                                      |
| -------------------- | --------------------------------- | ----------------------------------------- |
| カラー統合           | `--ag-*` 変数を追加（新レイヤー） | shadcn トークンは温存し、二重管理だが安全 |
| Palette 表示         | 現行 fixed div                    | 静的モックでは Tauri ウィンドウ変更不要   |
| カードグラデーション | カテゴリベース仮配色              | U-02 未決定のため                         |
| ウィンドウ外枠       | ネイティブ維持                    | Tauri 装飾はそのまま                      |
| 既存タブ             | 完全置換                          | Library に統合                            |

### 検証結果

- svelte-check: 0 errors
- biome check / dprint check: 0 issues
- vitest: 15 passed / cargo test: 116 passed
- E2E: 旧UIセレクタのため未通過（F-2 で修正）

---

## F-2: 動的化（pending）

モックデータを実データに差し替え、ストア・IPC を接続する。E2E テストを新UIに合わせて修正する。

### 技術要素

- `itemStore` / `paletteStore` / `workspaceStore` / `configStore` を新コンポーネントに接続
- 新規 IPC コマンド候補: `cmd_get_library_stats`, `cmd_search_items`（既存で足りるか要調査）
- `src/lib/mock/arcagate/` のインポートを実ストアに差し替え
- E2E テスト4ファイルのセレクタ修正（新UI構造に合わせる）
- `testing.md` のテスト件数・確認内容を更新

### 配線ポイント一覧

| 箇所                          | 接続先                                            |
| ----------------------------- | ------------------------------------------------- |
| LibrarySidebar カテゴリ       | `cmd_get_category_counts`                         |
| LibraryMainArea 検索          | `cmd_search_items`                                |
| LibraryMainArea 統計          | `cmd_get_library_stats`（新規 or 既存組み合わせ） |
| LibraryDetailPanel            | `itemStore` から詳細取得                          |
| LibraryDetailPanel アクション | `cmd_launch_item`, `cmd_add_widget` 等            |
| SensitiveControl              | `hiddenStore` 接続                                |
| QuickRegisterDropZone         | DropZone + `cmd_create_item`                      |
| WorkspaceLayout               | `workspaceStore` でワークスペース切替             |
| 各ウィジェット                | 対応 IPC コマンド                                 |
| PaletteOverlay                | `paletteStore` 接続（検索・キーボードナビ）       |
| Tip 閉じ状態                  | localStorage 永続化                               |
| MoreMenu                      | 各アクションの実ロジック                          |

---

## F-3: スタイル微調整（pending）

### 技術要素

- ウィンドウリサイズ時のレイアウト崩れ修正（Library 3カラム、Workspace 12カラムグリッド）
- 最小ウィンドウサイズでのフォールバック（カラム折りたたみ or スクロール）
- Palette オーバーレイの小画面対応
- `tauri.conf.json` の `minWidth` / `minHeight` 設定検討

---

## F-4: テーマ永続化（pending）

### 技術要素

- `themes` テーブルでカスタムカラーを永続化
- `configStore.themeMode` に統合（Dark/Light 切替の永続化）
- カスタムテーマ作成・編集 UI（Settings 導線: U-05 で配置先決定）
- テーマ インポート/エクスポート（JSON ファイル）

### DB マイグレーション

`src-tauri/migrations/005_themes.sql`:

```sql
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 0,
    css_vars TEXT NOT NULL DEFAULT '{}',  -- JSON: {"--ag-*": "value", ...}
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- プリセット
INSERT INTO themes (id, name, is_active, css_vars) VALUES
    ('theme-light', 'Light', 0, '{}'),
    ('theme-dark', 'Dark', 1, '{}');
```

---

## F-5: Git ステータス表示（pending）

### 技術要素

- `tauri-plugin-shell` で `git rev-parse --abbrev-ref HEAD` / `git status --short` を実行
- 監視フォルダ（`watched_paths`）内のディレクトリに `.git` が存在するか判定
- `ProjectsWidget` にブランチ名・未コミット変更の有無をアイコン表示
- ポーリング間隔 or ファイル監視イベント連動（要検討）

---

## 受け入れ条件

### F-1: 静的UIモック（done）

- [x] Library/Workspace 2タブ構造で画面が切り替わる
- [x] Library 画面: サイドバー + カードグリッド + 詳細パネルの3カラム表示
- [x] Workspace 画面: ページタブ + 12カラムウィジェットグリッド表示
- [x] Palette オーバーレイ: 2カラム（結果リスト + Quick context）表示
- [x] Dark テーマがデフォルト表示される
- [x] svelte-check / biome / dprint が全通過する
- [x] vitest / cargo test が全通過する

### F-2: 動的化（pending）

- [ ] Library カードが実データ（`itemStore`）から描画される
- [ ] Palette 検索が `paletteStore` 経由で動作する
- [ ] Workspace ウィジェットが実データ（IPC）から描画される
- [ ] E2E テスト（4ファイル）が新UIセレクタで全通過する
- [ ] `testing.md` が更新されている

### F-3: スタイル微調整（pending）

- [ ] ウィンドウを 800×600 〜 1920×1080 の範囲でリサイズしてもレイアウトが崩れない
- [ ] 最小ウィンドウサイズで主要操作（タブ切替、パレット開閉）が可能

### F-4: テーマ永続化（pending）

- [ ] テーマ（ダーク・ライト）を切り替えられ、再起動後も維持される
- [ ] カスタムカラーでテーマを作成・保存できる
- [ ] テーマを JSON ファイルとしてエクスポート/インポートできる

### F-5: Git ステータス表示（pending）

- [ ] 監視フォルダ内の Git リポジトリでブランチ名が表示される
- [ ] 未コミット変更の有無がアイコンで表示される

### 共通

- [ ] `pnpm verify` が全通過する（E2E 含む）

## 実装メモ（計画からの変更）

### UIリデザインの先行実施

当初 PH-003-F は「テーマ + Git ステータス」のみの予定だったが、`docs/l2_foundation/arcagate-mock-spec.md` で定義された新UIデザインの実装を先行させた。理由:

1. テーマ機能は新UIの `ThemeControlsWidget` / `PageTabBar` に組み込まれるため、旧UIに実装しても二度手間になる
2. Git ステータスは新UIの `ProjectsWidget` に表示するため、先にウィジェット構造が必要
3. 静的モックで先にレイアウト・導線を検証し、配線バグとデザインバグの切り分けを容易にする

### E2E テストの一時的な非通過

F-1 完了時点で既存 E2E テスト（11件）は旧UIセレクタを参照しているため通過しない。F-2 で新UIに合わせて修正する。

## 参照ドキュメント

- L0 Concept: `docs/l0_ideas/arcagate-concept.md` §8 M2a/M2b
- L0 Mock: `docs/l0_ideas/arcagate_mockup_board.jsx`（React + Tailwind リファレンス実装）
- L1 Requirements: `docs/l1_requirements/vision.md` §3（REQ-010）
- L2 Foundation: `docs/l2_foundation/foundation.md` §2.3（Service Layer）
- L2 Mock Spec: `docs/l2_foundation/arcagate-mock-spec.md`（UIデザイン仕様）
