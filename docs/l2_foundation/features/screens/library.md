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
