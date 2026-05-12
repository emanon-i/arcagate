# Library (ライブラリ)

全登録 item の一覧画面。 アイテムを登録 / タグ付け / 起動する。 default 画面 (アプリ起動時に最初に見えるタブ)。

route: `src/routes/+page.svelte` の `activeView === 'library'` 分岐

---

## 何があるか

### Sidebar (左)

| section          | 内容                                                   |
| ---------------- | ------------------------------------------------------ |
| ライブラリ全体   | すべて / お気に入り                                    |
| タイプ別         | exe / url / folder / script / command (sys-type-* tag) |
| ワークスペース別 | 各 workspace 名 system tag (sys-ws-*)                  |
| User タグ        | user-defined タグ                                      |

### Main area (右)

| 要素              | 内容                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| toolbar           | 検索 input + ソート / 順序 + 表示形式 (grid / list) + アイテム追加 + 複数選択 |
| stats             | 総アイテム数 / タグ数 / 今週の起動回数                                        |
| Card grid         | LibraryCard を多列 grid (S / M / L サイズ切替可)                              |
| Detail panel (右) | カード click で開く詳細 (icon + メタ + アクション + visibility toggle)        |

実装場所:

- `src/lib/components/arcagate/library/LibraryLayout.svelte` (root facade)
- `LibrarySidebar.svelte` / `LibraryMainArea.svelte` / `LibraryDetailPanel.svelte` / `LibraryCard.svelte`
- state: `src/lib/state/items.svelte.ts` / `src/lib/state/library-filter.svelte.ts`

---

## 機能

### アイテム登録

- **D&D**: exe / folder / script を Library tab に drop → ItemFormDialog open with `initialPaths`
- **URL D&D**: web から URL drag → `cmd_fetch_url_title` で title 取得 → ItemFormDialog open with `initialUrl`
- **ブックマーク取込**: HTML ブックマーク file 取込 → 一括選択 + タグ付与で bulk register
- **+ アイテムを追加**: form 手入力 / file picker / folder picker (E-4 / E-5 で readonly 撤廃 + native dialog)

### 表示形式 / ソート

- card S / M / L 切替 (config に永続化)
- ソート field: 名前 / 作成 / 更新 / 起動頻度 / 最終起動
- ソート order: asc / desc 切替
- ハイブリッド: grid / list (List view は未実装、 grid のみ)

### 検索 / フィルタ

- toolbar 検索 input で label fuzzy filter (live)
- sidebar tag click で type / workspace / user-tag フィルタ
- 非表示 toggle (`is_enabled = false` item) を sidebar から切替

### 詳細 panel

- LibraryDetailHeader (label + type badge + close)
- LibraryDetailMetadata (preview = LibraryCard 統一、 サイズ / 文字数 / 更新 / 作成、 visibility toggle)
- LibraryDetailActions (起動 / 編集 / お気に入り / 削除 の 2x2 grid)
- 「カード個別調整」 checkbox + CardOverrideDialog で per-card 背景 / 色 override

### 複数選択 mode

- toolbar 「複数選択」 button toggle (text が 「選択解除」 に変化)
- card click で multi-select、 bulk star / bulk delete 可能
- 選択中 action bar が下部に sticky 表示

### Item context menu (I-2)

- card 右クリック → 「Default app で開く / パスをコピー / Explorer で開く / アイテムを削除 / 設定を開く」
- max-width 20rem で長 path も「…」 truncate

---

## こうあってほしい (L0 抜粋)

- exe D&D で即登録 (アイコン自動取得)
- web site D&D で page name 自動取得
- ブックマーク file 取込で 一部/一括選択 + tag 付与
- タグで分類 / 絞り込み
- 起動頻度・最終起動順でソート
- カードサイズ S / M / L 選択可
- system tag (type / workspace) + user tag の 2 系統
- 不要アイテムは非表示 toggle で隠す

---

## 関連 IPC

| command                                                   | 用途                               |
| --------------------------------------------------------- | ---------------------------------- |
| `cmd_create_item` / `cmd_update_item` / `cmd_delete_item` | item CRUD                          |
| `cmd_list_items` / `cmd_search_items`                     | 一覧 / 検索                        |
| `cmd_extract_item_icon`                                   | exe / file icon 抽出 (Windows API) |
| `cmd_fetch_url_title`                                     | URL D&D 時の page title 取得       |
| `cmd_import_bookmarks`                                    | ブックマーク HTML 取込             |
| `cmd_toggle_star`                                         | お気に入り                         |
| `cmd_get_library_stats` / `cmd_get_tag_counts`            | sidebar / stats 表示               |
| `cmd_create_tag` / `cmd_update_tag` / `cmd_delete_tag`    | user tag CRUD                      |

---

## 制約 / Non-goals

- list view は未実装 (card grid のみ)
- セマンティック検索 / 内容検索なし (label / aliases / tag のみ)
- マルチデバイス同期なし (1 PC 完結)
