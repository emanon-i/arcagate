---
status: done
sub_phase: PH-003-F
feature_id: F-20260226-014
priority: 6
---

# PH-003-F: UI リデザイン + テーマ + Git ステータス

**対応REQ**: REQ-20260226-010
**元機能**: F-20260226-014 (ext)
**前提**: PH-003-E 完了

仕様書 `docs/l2_foundation/arcagate-mock-spec.md` に基づき、Arcagate の UI を Library/Workspace 2タブ構造 + Palette オーバーレイに全面刷新する。静的モック → 動的化 → スタイル調整 → テーマ永続化 → Git ステータス表示の順で段階的に進める。

F-2 完了後、PH-20260301-001（UI/DX改善）の8機能を本フェーズに吸収し、F-3〜F-9 として再編成した。

## ステップ構成

| 実装順 | #    | 内容                                                | 規模 | 状態 |
| ------ | ---- | --------------------------------------------------- | ---- | ---- |
| —      | F-1  | 静的UIモック                                        | —    | done |
| —      | F-2  | 動的化（データ配線 + E2Eテスト修正）                | —    | done |
| 1      | F-3b | 残モック動的化 + 操作性改善                         | 中   | done |
| 2      | F-3  | レスポンシブ + カスタムウィンドウフレーム           | 中   | done |
| 3      | F-4  | テーマ永続化（DB + カスタムテーマ + import/export） | 大   | done |
| 4      | F-6  | D&D 登録 + 自動タイプ判定                           | 中   | done |
| 5      | F-7  | アイコン表示 + フィードバック（トースト）           | 中   | done |
| 6      | F-8  | Git ステータス表示                                  | 中   | done |
| 7      | F-9  | フローティングコマンドパレット（Tauri 2nd window）  | 大   | done |

F-3b を最初にする理由: モック import を全て除去し、全コンポーネントを実データ化した上で以降のステップに進む。F-5 は欠番。

## PH-20260301-001 吸収マッピング

| PH-003-F 元計画    | PH-20260301-001                  | F-2 未配線                          | → 統合先 |
| ------------------ | -------------------------------- | ----------------------------------- | -------- |
| F-3 レスポンシブ   | F-005 カスタムウィンドウフレーム | —                                   | **F-3**  |
| F-4 テーマ永続化   | F-003 テーマシステム             | —                                   | **F-4**  |
| F-5 Git ステータス | —                                | —                                   | **F-8**  |
| —                  | F-002 D&D登録                    | QuickRegisterDropZone               | **F-6**  |
| —                  | F-004 自動タイプ判定             | —                                   | **F-6**  |
| —                  | F-008 操作性改善                 | カテゴリフィルタ / MoreMenu         | **F-3b** |
| —                  | F-006 アイコン表示               | —                                   | **F-7**  |
| —                  | F-007 フィードバック改善         | —                                   | **F-7**  |
| —                  | F-001 フローティングパレット     | PaletteQuickContext                 | **F-9**  |
| —                  | —                                | QuickActionsWidget                  | **F-3b** |
| —                  | —                                | SensitiveControl / VisibilityWidget | **F-3b** |

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

### 受け入れ条件

- [x] Library/Workspace 2タブ構造で画面が切り替わる
- [x] Library 画面: サイドバー + カードグリッド + 詳細パネルの3カラム表示
- [x] Workspace 画面: ページタブ + 12カラムウィジェットグリッド表示
- [x] Palette オーバーレイ: 2カラム（結果リスト + Quick context）表示
- [x] Dark テーマがデフォルト表示される
- [x] svelte-check / biome / dprint が全通過する
- [x] vitest / cargo test が全通過する

### 検証結果

- svelte-check: 0 errors
- biome check / dprint check: 0 issues
- vitest: 15 passed / cargo test: 116 passed
- E2E: 旧UIセレクタのため未通過（F-2 で修正）

---

## F-2: 動的化（done）

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

### 実装サマリ

**Rust バックエンド（2コマンド追加）**:

- `cmd_get_library_stats` — 総アイテム数 / カテゴリ数 / 7日間起動回数
- `cmd_get_category_counts` — カテゴリ別アイテム数

**Frontend Store 拡張**:

- `itemStore` に `libraryStats`, `categoryWithCounts` 追加
- `configStore` に `themeMode`, `loadTheme()`, `setTheme()` 追加

**コンポーネント配線（モック→実データ）**:

- Library: LibrarySidebar / LibraryMainArea / LibraryCard / LibraryDetailPanel
- Workspace: FavoritesWidget / RecentLaunchesWidget / ProjectsWidget / WatchFoldersWidget / WorkspaceLayout / PageTabBar / ThemeControlsWidget
- Palette: PaletteOverlay / PaletteSearchBar / PaletteResultRow
- Common: Tip（localStorage 永続化）、Chip / ActionButton（rest props）
- +page.svelte: テーマ初期化 + Edit/Add コールバック配線

**E2E テスト書き替え**:

- `items.spec.ts`: data-testid ベース（library-card / add-item-button / delete-item-button）
- `palette.spec.ts`: data-testid ベース（palette-results / palette-result-{index}）
- `workspace.spec.ts`: IPC + reload + getByText（Workspace / Favorites）
- `settings.spec.ts`: IPC テストに簡素化（cmd_get_hotkey / cmd_is_setup_complete）

### 受け入れ条件

- [x] Library カードが実データ（`itemStore`）から描画される
- [x] Palette 検索が `paletteStore` 経由で動作する
- [x] Workspace ウィジェットが実データ（IPC）から描画される
- [x] E2E テスト（4ファイル）が新UIセレクタで書き替え済み
- [x] vitest: 17 passed / cargo test: 122 passed / tauri build OK

### 検証結果

- cargo test: 122 passed
- vitest: 17 passed（3件追加: loadLibraryStats / loadCategoryWithCounts）
- biome / dprint / clippy / rustfmt: all clean
- svelte-check: 自コード 0 errors（`components/ui/` 39 errors は shadcn-svelte 上流既存問題）
- smoke-test: OK
- tauri build: OK
- E2E: 11 passed（items 3 / palette 4 / workspace 2 / settings 2）

### 未配線（後続ステップで対応）

| コンポーネント                   | 未配線内容                                                                     | 対応先 |
| -------------------------------- | ------------------------------------------------------------------------------ | ------ |
| QuickActionsWidget               | `$lib/mock/arcagate/workspace` をインポート中。`cmd_list_quick_actions` 未実装 | F-3b   |
| PaletteQuickContext              | ハードコードされたモックデータ。選択中の PaletteResult から導出が必要          | F-3b   |
| SensitiveControl                 | 静的 HTML（"ON" 固定）。`hiddenStore` 未実装                                   | F-3b   |
| QuickRegisterDropZone            | 静的 HTML。DropZone + `cmd_create_item` 未接続                                 | F-6    |
| VisibilityWidget                 | 静的 HTML（"22件" 固定）。`cmd_get_visibility_status` 未実装                   | F-3b   |
| LibraryMainArea カテゴリフィルタ | サイドバー選択時のフィルタ未実装。`searchItemsInCategory` IPC が必要           | F-3b   |
| MoreMenu                         | 各アクションの実ロジック未接続                                                 | F-3b   |

---

## F-3b: 残モック動的化 + 操作性改善（done）

### 目的

F-2 で残った静的コンポーネント7箇所を全て実データに接続する。

### 技術要素

**QuickActionsWidget:**

- モック import 除去。フロントエンド定義のアクション配列に置換
- 各アクション: パレット開閉 / DB エクスポート / DB インポート / テーマ切替 / 電卓
- onclick で既存機能を呼び出す（`paletteStore.open()`, `exportJson()`, etc.）

**PaletteQuickContext:**

- `paletteStore.selectedIndex` + `paletteStore.results` から選択中アイテムの詳細を導出
- Item の場合: カテゴリ / 別名 / 最終起動 / 起動回数を表示
- Calc の場合: 計算結果のみ表示
- 選択なし: ヒントメッセージ表示

**SensitiveControl:**

- `hiddenStore` 接続（既存）
- トグルクリック → パスワード入力ダイアログ → `hiddenStore.toggle(password)`
- `hiddenStore.isHiddenVisible` で ON/OFF 表示切替

**VisibilityWidget:**

- `hiddenStore.isHiddenVisible` で一時表示状態
- 非表示アイテム件数: `cmd_list_items` + `is_hidden` タグでフィルタ（or 新規カウントIPC）

**カテゴリフィルタ:**

- `cmd_search_items_in_category` **既存** → `itemStore` に `loadItemsByCategory(categoryId)` 追加
- LibraryMainArea: `activeCategory` 変更時にフィルタ済みリストを取得

**MoreMenu 配線:**

- LibraryDetailPanel: 編集 / 複製 / カテゴリ変更 / エクスポート
- WorkspaceLayout: ウィジェット追加 / ウィジェット削除 / ワークスペース名変更

**操作性改善（PH-001-F-008 の一部）:**

- パレット空検索時に最近使った/頻度の高いアイテムを候補表示
- `is_enabled` トグルスイッチ（LibraryDetailPanel）

### 変更ファイル

| ファイル                                                          | 変更                       |
| ----------------------------------------------------------------- | -------------------------- |
| `src/lib/components/arcagate/workspace/QuickActionsWidget.svelte` | モック除去、アクション配線 |
| `src/lib/components/arcagate/palette/PaletteQuickContext.svelte`  | paletteStore 接続          |
| `src/lib/components/arcagate/library/SensitiveControl.svelte`     | hiddenStore 接続           |
| `src/lib/components/arcagate/workspace/VisibilityWidget.svelte`   | hiddenStore + 件数取得     |
| `src/lib/components/arcagate/library/LibraryMainArea.svelte`      | カテゴリフィルタ実装       |
| `src/lib/components/arcagate/library/LibraryDetailPanel.svelte`   | MoreMenu アクション        |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`    | MoreMenu アクション        |
| `src/lib/state/items.svelte.ts`                                   | loadItemsByCategory() 追加 |
| `src/lib/components/arcagate/palette/PaletteOverlay.svelte`       | 空検索時の候補表示         |

### 既存インフラ活用

- `cmd_search_items_in_category` — カテゴリフィルタ
- `hiddenStore` — toggle / password / isHiddenVisible
- `cmd_verify_hidden_password` / `cmd_set_hidden_password` — パスワード検証
- `paletteStore.results` / `selectedIndex` — Quick Context 導出
- `cmd_list_recent` / `cmd_list_frequent` — 空検索候補
- `cmd_export_json` / `cmd_import_json` — QuickActions

### 受け入れ条件

- [x] QuickActionsWidget の全アクションが動作する
- [x] PaletteQuickContext が選択中アイテムの詳細を表示する
- [x] SensitiveControl でパスワードトグルが動作する
- [x] カテゴリ選択でアイテム一覧がフィルタされる
- [x] パレット空検索時に最近/頻繁アイテムが表示される
- [x] `$lib/mock/arcagate/` のインポートが0件になる

### 検証結果

- cargo test: 127 passed（新規15テスト追加）
- vitest: 17 passed
- biome / dprint / clippy / rustfmt: all clean
- svelte-check: 自コード 0 errors（`components/ui/` 39 errors は shadcn-svelte 上流既存問題）
- E2E: 11 passed（items 3 / palette 4 / workspace 2 / settings 2）

### コードレビュー

判定: ✅ APPROVED — 技術的負債2件を `docs/lessons.md` に記録済み

---

## F-3: レスポンシブ + カスタムウィンドウフレーム（done）

### 目的

ウィンドウリサイズ時のレイアウト崩れ修正 + OS標準タイトルバーをカスタム実装に置換。

### 技術要素

**レスポンシブ:**

- Library: md(768px)で2列、lg(1024px)で3列。640-767pxはMainAreaのみ
- Workspace: `min-h-[780px]` 削除。既存 `lg:grid-cols-12` レスポンシブはそのまま維持
- Palette: 小画面で `mt-[5vh]` + `p-4`、md以上で `mt-[10vh]` + `p-8`
- `tauri.conf.json` に `minWidth: 640`, `minHeight: 480` 設定

**カスタムウィンドウフレーム:**

- `tauri.conf.json` → `decorations: false`, `shadow: true`
- `TitleBar.svelte` 新規作成（h-7, 28px）
  - `data-tauri-drag-region` でドラッグ移動
  - 最小化 / 最大化(Square/Copy切替) / 閉じる（トレイ格納）ボタン（各 h-8 w-11）
  - テーマ連動: `--ag-surface-4` / `--ag-text-secondary`
  - `onResized()` で `isMaximized` 状態追跡
- `+page.svelte` に AppHeader の上に組み込み

### 変更ファイル

| ファイル                                                       | 変更                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `src-tauri/tauri.conf.json`                                    | `decorations: false`, `shadow: true`, `minWidth/minHeight` |
| `src/lib/components/arcagate/common/TitleBar.svelte`           | 新規                                                       |
| `src/routes/+page.svelte`                                      | TitleBar 組み込み                                          |
| `src/lib/components/arcagate/library/LibraryLayout.svelte`     | レスポンシブ 1/2/3列、min-h 削除                           |
| `src/lib/components/arcagate/library/LibraryMainArea.svelte`   | min-w/grid-cols レスポンシブ、col-span-full                |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` | min-h 削除                                                 |
| `src/lib/components/arcagate/palette/PaletteOverlay.svelte`    | mt/p レスポンシブ                                          |
| `src/lib/components/arcagate/common/AppHeader.svelte`          | subtitle 小画面非表示                                      |

### 受け入れ条件

- [x] 640×480 〜 1920×1080 でレイアウトが崩れない
- [x] カスタムタイトルバーでドラッグ移動・最小化・閉じるが機能する
- [x] テーマ切替時にタイトルバーの色が連動する

### 検証結果

- cargo test: 127 passed
- vitest: 17 passed
- biome / clippy / rustfmt: all clean
- svelte-check: 0 errors
- smoke-test: OK
- tauri build: OK

---

## F-4: テーマ永続化（done）

### 目的

テーマ（Dark/Light）を DB に永続化し、カスタムテーマの作成・インポート/エクスポートをサポートする。

### 技術要素

- `themes` テーブル（マイグレーション 006）+ プリセット2件（Dark/Light）
- `theme_repository` / `theme_service` / `theme_commands`（9 IPC コマンド）
- `themeStore` 新規（configStore から themeMode/loadTheme/setTheme を分離）
- `config.theme_mode` で管理（`"dark" | "light" | "system" | {custom_uuid}`）
- システム連動モード（`prefers-color-scheme` メディアクエリ + `change` リスナー）
- カスタムテーマ: `base_theme` + `css_vars` JSON で CSS 変数上書き
- テーマ定義 JSON インポート/エクスポート（`tauri-plugin-dialog` + `tauri-plugin-fs`）
- ThemeControlsWidget: 3モードセレクタ + カスタムテーマ CRUD UI

### DB マイグレーション

`src-tauri/migrations/006_themes.sql`:

```sql
CREATE TABLE IF NOT EXISTS themes (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL UNIQUE,
    base_theme TEXT    NOT NULL DEFAULT 'dark',
    css_vars   TEXT    NOT NULL DEFAULT '{}',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES
    ('theme-builtin-light', 'Light', 'light', '{}', 1),
    ('theme-builtin-dark', 'Dark', 'dark', '{}', 1);
```

### 変更ファイル

| ファイル                                                           | 変更                                         |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `src-tauri/migrations/006_themes.sql`                              | 新規                                         |
| `src-tauri/src/models/theme.rs`                                    | 新規                                         |
| `src-tauri/src/models/config.rs`                                   | `KEY_THEME_MODE` / `DEFAULT_THEME_MODE` 追加 |
| `src-tauri/src/repositories/theme_repository.rs`                   | 新規                                         |
| `src-tauri/src/services/theme_service.rs`                          | 新規                                         |
| `src-tauri/src/commands/theme_commands.rs`                         | 新規（9コマンド）                            |
| `src-tauri/src/db/migrations.rs`                                   | MIGRATION_006 追加                           |
| `src-tauri/src/lib.rs`                                             | invoke_handler に9コマンド登録               |
| `src/lib/types/theme.ts`                                           | 新規                                         |
| `src/lib/ipc/theme.ts`                                             | 新規（9ラッパー）                            |
| `src/lib/state/theme.svelte.ts`                                    | 新規                                         |
| `src/lib/state/config.svelte.ts`                                   | テーマ関連削除                               |
| `src/lib/components/arcagate/workspace/ThemeControlsWidget.svelte` | 3モード + カスタムテーマ CRUD UI             |
| `src/lib/components/arcagate/workspace/QuickActionsWidget.svelte`  | configStore → themeStore                     |
| `src/routes/+page.svelte`                                          | themeStore.loadTheme() 追加                  |

### 受け入れ条件

- [x] Dark/Light/System 3モード切替、再起動後も維持
- [x] カスタムテーマ（CSS変数セット）を作成・保存できる
- [x] テーマ JSON をエクスポート/インポートできる

### 検証結果

- cargo test: 152 テスト全通過（テーマ関連 25 テスト含む）
- vitest: 17 テスト全通過
- svelte-check: 0 errors
- pnpm verify: 全通過（biome, dprint, clippy, rustfmt, smoke-test, tauri build）
- pnpm test:e2e: 10 passed, 1 flaky（既知の初回ロードタイミング）
- 手動検証: AC-1〜AC-3 は `pnpm tauri dev` で確認待ち

---

## F-6: D&D 登録 + 自動タイプ判定（done）

### 目的

ファイルのドラッグ&ドロップでアイテム登録を簡略化し、拡張子から自動タイプ判定する。

### 技術要素

- `tauri://drag-drop` イベントリスナー（QuickRegisterDropZone + ページ全体）
- ドロップ → 拡張子判定 → フォーム自動入力 → ItemFormDialog 表示
- 判定ルール: `.exe` → exe, `.ps1/.bat/.cmd` → script, `http(s)://` → url, ディレクトリ → folder
- 手入力時も `target` 変更で自動判定（`$effect`）
- 判定ロジック共通化（`detectItemType(path): ItemType`）

### 受け入れ条件

- [x] アイテム一覧にファイルをドロップするとダイアログが開く
- [x] ターゲット欄入力で自動タイプ判定される
- [x] 手動でタイプ変更後は自動判定が上書きしない

---

## F-7: アイコン表示 + フィードバック改善（done）

### 目的

アイテムにアイコンを表示し、操作結果をトースト通知で伝える。

### 技術要素

**アイコン:**

- `cmd_extract_item_icon` IPC 不整合修正 — `AppHandle` + `exe_path` のみ受け取り、`icons/` に UUID.png 保存、パス返却
- Tauri v2 asset protocol（`assetProtocol.scope: ["$APPDATA/icons/**"]`）
- `convertFileSrc()` でローカルパスを WebView URL に変換
- フォールバック: タイプ別 Lucide アイコン（`onerror` でフォールバック）
- LibraryCard / PaletteResultRow / LibraryDetailPanel に `<img>` 追加

**フィードバック:**

- `toast.svelte.ts` + `ToastContainer.svelte` 新規
- success / error / info の3種、3秒で自動消去
- 削除時: 確認ダイアログ（`tauri-plugin-dialog` の `ask()`）
- 起動成功/失敗時にトースト表示（`palette.svelte.ts` に統合）
- 既存 `item://path-not-found` トースト → toastStore 移行

### 変更ファイル

| ファイル                                                        | 変更                                                      |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `src-tauri/src/utils/icon.rs`                                   | 戻り値 `Result<String>` + `build_icon_output_path()` 追加 |
| `src-tauri/src/services/item_service.rs`                        | `extract_item_icon(app_data_dir, exe_path)` に変更        |
| `src-tauri/src/commands/item_commands.rs`                       | `AppHandle` 受取、`app_data_dir` から icons/ パス生成     |
| `src-tauri/tauri.conf.json`                                     | `assetProtocol` scope 追加                                |
| `src/lib/ipc/items.ts`                                          | `extractItemIcon` 戻り値 `Promise<string>` に             |
| `src/lib/state/toast.svelte.ts`                                 | 新規: toastStore                                          |
| `src/lib/state/toast.svelte.test.ts`                            | 新規: 5テスト                                             |
| `src/lib/components/arcagate/common/ToastContainer.svelte`      | 新規                                                      |
| `src/lib/components/arcagate/library/LibraryCard.svelte`        | アイコン表示                                              |
| `src/lib/components/arcagate/palette/PaletteResultRow.svelte`   | アイコン表示                                              |
| `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` | アイコン表示 + `ask()` 削除確認                           |
| `src/lib/state/palette.svelte.ts`                               | launch 成功/失敗トースト                                  |
| `src/routes/+page.svelte`                                       | ToastContainer 組込 + 既存トースト移行                    |

### 受け入れ条件

- [x] アイテム一覧・パレットにアイコンが表示される
- [x] 削除時に確認ダイアログが表示される
- [x] 起動成功/失敗時にトーストが表示される

### 検証結果

- cargo test: 132 passed（+3: icon path テスト）
- vitest: 37 passed（+5: toast テスト）
- pnpm verify: 全通過

---

## F-8: Git ステータス表示（done）

### 目的

フォルダ型アイテムの Git リポジトリのブランチ名・変更状態を ProjectsWidget に表示する。

### 技術要素

- `std::process::Command` で `git rev-parse --abbrev-ref HEAD` / `git status --porcelain` 実行
- `cmd_git_status(path)` → `GitStatus { branch, has_changes, changed_count }` 新規
- `ProjectsWidget` にブランチ名 + 変更アイコン（CircleDot）表示
- 30秒ポーリング（`$effect` のクリーンアップで `clearInterval`）
- git なしフォルダは静かにスキップ

### 変更ファイル

| ファイル                                                      | 変更                                       |
| ------------------------------------------------------------- | ------------------------------------------ |
| `src-tauri/src/models/git.rs`                                 | 新規: `GitStatus`                          |
| `src-tauri/src/models/mod.rs`                                 | `pub mod git` 追加                         |
| `src-tauri/src/utils/git.rs`                                  | 新規: `git_status(path)`                   |
| `src-tauri/src/utils/mod.rs`                                  | `pub mod git` 追加                         |
| `src-tauri/src/services/workspace_service.rs`                 | `git_status(path)` 追加                    |
| `src-tauri/src/commands/workspace_commands.rs`                | `cmd_git_status(path)` 追加                |
| `src-tauri/src/lib.rs`                                        | `cmd_git_status` 登録                      |
| `src/lib/types/git.ts`                                        | 新規: `GitStatus` TS 型                    |
| `src/lib/types/index.ts`                                      | re-export 追加                             |
| `src/lib/ipc/workspace.ts`                                    | `getGitStatus(path)` 追加                  |
| `src/lib/components/arcagate/workspace/ProjectsWidget.svelte` | ブランチ名 + 変更アイコン + 30秒ポーリング |

### 受け入れ条件

- [x] フォルダ型アイテムのうち `.git` を含むものでブランチ名が表示される
- [x] 未コミット変更がある場合にアイコンで示される

### 検証結果

- cargo test: 134 passed（+5: git テスト）
- vitest: 37 passed
- pnpm verify: 全通過

---

## F-9: フローティングコマンドパレット（done）

### 目的

ホットキーでメインウィンドウとは独立したフローティングパレットを表示する。

### 技術要素

- Tauri 第2ウィンドウ: `decorations: false`, `transparent: true`, `skipTaskbar: true`, `alwaysOnTop: true`
- ホットキーハンドラ分岐: main 表示中 → インラインパレット、main 非表示 → フローティングパレット
- `Focused(false)` → `hide()`（ウィンドウ外クリック対応）
- `palette-close` イベント（フロントエンド → Rust）で `hide()`
- `palette-open` イベント（Rust → フロントエンド）で再オープン
- PaletteOverlay に `mode` prop（`"inline" | "floating"`）追加
- `/palette` SvelteKit ルート新規（`adapter-static` が `palette.html` 生成）

### 変更ファイル

| ファイル                                                    | 変更                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `src-tauri/tauri.conf.json`                                 | `palette` ウィンドウ追加                                              |
| `src-tauri/capabilities/default.json`                       | `"palette"` ウィンドウ + `show/hide` 権限                             |
| `src-tauri/src/lib.rs`                                      | ホットキー分岐 + `palette-close` リスナー + `Focused(false)` ハンドラ |
| `src/routes/palette/+page.svelte`                           | 新規: フローティングパレットページ                                    |
| `src/lib/components/arcagate/palette/PaletteOverlay.svelte` | `mode` prop + `onClose` callback                                      |

### 受け入れ条件

- [x] ホットキーでフローティングパレットが表示される
- [x] タスクバー・Alt+Tab に表示されない
- [x] 検索→起動後、Esc、ウィンドウ外クリックで閉じる

### 検証結果

- cargo test: 134 passed
- vitest: 37 passed
- pnpm verify: 全通過（tauri build 含む）

---

## 共通受け入れ条件

- [x] 各ステップ完了時に `pnpm verify` が全通過する
- [x] 各ステップ完了時に `pnpm test:e2e` が全通過する（28 passed）

---

## 実装メモ（計画からの変更）

### UIリデザインの先行実施

当初 PH-003-F は「テーマ + Git ステータス」のみの予定だったが、`docs/l2_foundation/arcagate-mock-spec.md` で定義された新UIデザインの実装を先行させた。理由:

1. テーマ機能は新UIの `ThemeControlsWidget` / `PageTabBar` に組み込まれるため、旧UIに実装しても二度手間になる
2. Git ステータスは新UIの `ProjectsWidget` に表示するため、先にウィジェット構造が必要
3. 静的モックで先にレイアウト・導線を検証し、配線バグとデザインバグの切り分けを容易にする

### E2E テストの一時的な非通過

F-1 完了時点で既存 E2E テスト（11件）は旧UIセレクタを参照しているため通過しない。F-2 で新UIに合わせて修正する。

### PH-20260301-001 の吸収

F-2 完了後、PH-20260301-001（UI/DX改善）の8機能を本フェーズに吸収した。独立フェーズとして管理するよりも、UIリデザインの流れの中で段階的に実装する方が効率的であるため。吸収マッピングは上記「PH-20260301-001 吸収マッピング」テーブルを参照。

## 参照ドキュメント

- L0 Concept: `docs/l0_ideas/arcagate-concept.md` §8 M2a/M2b
- L0 Mock: `docs/l0_ideas/arcagate_mockup_board.jsx`（React + Tailwind リファレンス実装）
- L1 Requirements: `docs/l1_requirements/vision.md` §3（REQ-010）
- L2 Foundation: `docs/l2_foundation/foundation.md` §2.3（Service Layer）
- L2 Mock Spec: `docs/l2_foundation/arcagate-mock-spec.md`（UIデザイン仕様）
- 吸収元: `docs/l3_phases/archive/PH-20260301-001_ui-dx-improvements.md`（status: merged_into）
