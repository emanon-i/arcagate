# Library 画面

> Functional Spec。機能契約のみ記載。詳細な機能カタログは [`../../screens/library.md`](../../screens/library.md)。

## 目的

全登録 item の一覧画面。item を登録 / タグ付け / 起動する。アプリ起動時に最初に見える default 画面。

## やること (必要処理)

- item の一覧表示 (card grid、S / M / L サイズ切替)
- item 登録: exe / folder / script の D&D、URL の D&D (title 自動取得)、ブックマーク HTML 取込、手入力 form + file/folder picker
- toolbar 検索 input で label の fuzzy filter (live)
- sidebar tag (type / workspace / user tag) でフィルタ、非表示 item の toggle
- ソート (名前 / 作成 / 更新 / 起動頻度 / 最終起動、asc / desc)
- detail panel で icon + metadata + アクション (起動 / 編集 / お気に入り / 削除) + per-card 視覚 override
- 複数選択 mode で bulk star / bulk delete
- card 右クリック context menu (Default app で開く / パスをコピー / Explorer で開く / 削除 / 設定)
- sidebar 統計 (総 item 数 / タグ数 / 今週の起動回数) の表示

## やらないこと (禁止 / scope 外)

- list view を提供しない (card grid のみ。未実装)
- セマンティック検索 / 内容検索をしない (label / aliases / tag のみ)
- マルチデバイス同期をしない (1 PC 完結)
- **per-card の $effect から個別 IPC を呼ばない** (metadata / icon は store で 1 回 batch fetch + cache、N card で N 並列 invoke 禁止 — lessons.md per-card $effect IPC の罠)
- **metadata 取得で非画像 file のハンドルを開かない** (Defender real-time scan を誘発し freeze する — #524 真因)
- item 起動・OS アクセスを frontend でしない (backend 経由)

## 性能予算

- 画面遷移 P95: warm < 200ms / cold < 2000ms (実機 SMR HDD・100+ item 基準)
- card 一覧の metadata warmup は async (`cmd_get_items_metadata_batch`)、main thread を block しない
- 検索入力 → 結果反映 < 100ms

## 副作用 (state 変化 / persistence)

- `items` / `item_tags` / `tags` / `launch_log` テーブルへ CRUD
- icon を `%APPDATA%/icons/<uuid>.png` に保存
- mutation 系 store 関数は内部で sidebar 統計 / tag count を一括 refresh (caller に refresh 責務を持たせない — lessons.md)

## 依存

- IPC: `cmd_create_item` / `cmd_update_item` / `cmd_delete_item` / `cmd_list_items` / `cmd_search_items` / `cmd_extract_item_icon` / `cmd_fetch_url_title` / `cmd_import_bookmarks` / `cmd_toggle_star` / `cmd_get_library_stats` / `cmd_get_tag_counts` / `cmd_create_tag` / `cmd_update_tag` / `cmd_delete_tag` / `cmd_get_items_metadata_batch`
- backend: [Item Service](../backend/item-service.md) / [Tag Service](../backend/tag-service.md) / [Icon Service](../backend/icon-service.md) / [Metadata Service](../backend/metadata-service.md)
- 依存される: Palette / 各 library 系 widget (Favorites / Recent / Stats / Item)

## 既知の判断

- icon は file system 保存 (base64 TEXT 比で容量 33% 削減、search query で icon data を load しない)
- system tag は type 系 (`sys-type-*`) と workspace 系 (`sys-ws-*`) の 2 系統 + user tag

## 破壊的操作の確認契約 (PH-CF-300)

item / workspace / タブの削除など取り返しのつかない操作は、 **専用 confirm modal** または
**undo-toast** のいずれかを必ず経由する。 `window.confirm` / `window.alert` / `window.prompt`
は使わない (チェックボックス等の拡張不能・OS 依存の見た目・ag-glass theme と不整合)。
削除確認モーダルは影響範囲 (削除される item 数 / 連鎖削除の有無) を文言で明示する。

### Library での適用

- **カード右クリックメニューの「削除」 (C1)**: `LibraryView.svelte` で開き、 `deleteWithUndo`
  経由で `LibraryUndoSnackbar` の undo-toast 経路に乗せる (5 秒以内なら元に戻せる)。
- **複数選択時の一括削除**: 専用 `ConfirmDialog` (`destructive` variant、 削除件数 + 影響
  範囲文言を `extraNote` で表示)。 確認後に `bulkDeleteItems` を実行。
- **detail panel の削除ボタン**: Tauri `ask()` (OS-native confirm) で確認、 確認後に
  `deleteWithUndo` 経路で undo-toast を出す (既存)。

### 機械検出

- `scripts/audit-window-confirm.sh` が `src/**/*.{ts,svelte}` に対し
  `window.confirm|window.alert|window.prompt` 0 件を検証 (lefthook + `pnpm audit:all` で gate)。
- e2e: `tests/e2e/destructive-confirm.spec.ts` が
  (a) Library カード右クリック → 「削除」 表示 + クリックで item 消滅 + undo snackbar 表示
  (b) 複数選択 → 削除 → ConfirmDialog 経由
  を検証。

## hidden 表示契約 (PH-CF-600 C4)

「非表示を表示」 (`configStore.libraryShowHidden`) ON 時、 hidden (`is_enabled = false`)
item は **All タブだけでなく Type タブ / tag タブでも表示** する。 表示はグレーアウト
(`LibraryCard` の `opacity-40 grayscale`) で hidden 状態を視覚的に区別する。

hidden を返すかは backend クエリの `include_disabled` 引数で明示制御し、 呼び出し側が画面の
意図に応じて渡す。 `is_enabled = 1` をクエリにハードコード固定除外しない (PH-CF-600 以前は
`searchItemsInTag` が固定除外で Type タブから hidden が消えていた)。

共有クエリ (`searchItemsInTag` 等) の挙動を変えるときは **全 call-site を matrix で確認**
する。 詳細な matrix は `src/lib/ipc/items.ts` の `searchItemsInTag` doc comment と
[Item Service hidden item 取得契約](../backend/item-service.md#hidden-item-取得契約-ph-cf-600-c4)
を参照。

### 機械検出

- backend unit test `test_search_in_tag_include_disabled_flag` (`src-tauri/src/repositories/item_repository.rs`)
- e2e: `tests/e2e/ph-cf-600-library-bug-fixes.spec.ts` の hidden item Type タブ表示シナリオ
  (「非表示を表示」 ON + Type=exe タブで hidden exe item がグレーアウト表示される /
  FavoritesWidget には hidden item が漏れない)

## detail panel 閉じ条件契約 (PH-CF-600 C7)

Library detail panel が閉じるのは **余白クリックのみ**。 検索バー / sort select / view モード
切替 button / add button / グリッド内のインタラクティブ要素のクリックでは閉じない。

実装方針: 閉じトリガーは `e.target === e.currentTarget` (= padding 領域そのもののクリック) に
限定する。 「カードでなければ閉じる」 のホワイトリスト方式
(`closest('[data-testid^="library-card-"]')`) は対象集合が広すぎて検索バー / sort 等の
インタラクティブ要素まで閉じトリガーになる構造欠陥のため使わない。 click-outside の正規
パターンは `ContextMenu.svelte` の `contains()` 判定。

### 機械検出

- e2e: `tests/e2e/ph-cf-600-library-bug-fixes.spec.ts` で detail panel を開いた状態で
  検索バー / sort select クリック → panel が閉じない、 余白クリック → 閉じる を verify。
