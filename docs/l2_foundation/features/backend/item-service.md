# Item Service

> backend feature / レイヤー: commands → service → repository → SQLite

## 目的

Item (exe / url / folder / script / command の 5 type) の CRUD と tag 連携、検索を担う backend feature。Library / Palette / 各 widget の登録・列挙の単一経路。

## やること (必要処理)

- item の create (UUID v7 生成 → insert → system tag 自動付与 + user tag 設定を 1 transaction)
- list / get / update / delete
- 検索: label / aliases の fuzzy match + workspace 名の部分一致 (U-9)
- bulk import (workspace init / exe scan 登録時の一括 insert)
- item tag の add / remove / set、enabled / disabled 制御
- URL D&D 時の title 取得、ブックマーク HTML の取込

## やらないこと (禁止 / scope 外)

- item の指す物理ファイルを削除・移動しない (DB レコードのみ操作)
- icon cache の GC をしない (caller / 別 feature の責務)
- Repository を跨いだ相互参照をしない (service 層で組み合わせる)
- item 起動をしない ([Launcher](./launcher.md) の責務)
- 検索でファイル内容や FS 全体を走査しない (DB の label / aliases / tag のみ)

## 性能予算

- 検索は SQL index (`idx_items_label` 等) 前提。1 user / 数百 item で Pool 不要
- create / update は単一 transaction (Drop で auto-rollback)

## 副作用 (state 変化 / persistence)

- `items` / `item_tags` / `tags` テーブルへ write
- create 時に system tag (`sys-type-*` / `sys-ws-*`) を自動生成

## 依存

- repository: `item_repository` / `tag_repository` / `workspace_repository` / `icon_cache_repository`
- DB: `items` / `item_tags` / `tags`
- 依存される: Library / Palette / Favorites / Recent / Stats / Item / Projects / Exe Folder widget

## 機能契約

### item 参照整合契約 (PH-CF-100)

item を削除する全経路の後、 その item を指す widget config `item_ids` は **同一トランザクション内**
で除去するか、 参照側が missing id を graceful に skip する。 `find_by_id` の `NotFound` を UI 操作
経路で握りつぶさず toast 化してよいのは「ユーザーが今まさに開いた item が消えていた」 例外時のみ
(`error-monitor` の generic な NotFound silent path に乗せて過剰トースト抑止)。

### 監視アイテムの所有関係契約 (PH-CF-100)

監視ウィジェット (projects / exe_folder) 由来の item は **`(source_widget_id, source_entry_key)`**
の back-link を必ず持つ:

- `source_widget_id` (FK→workspace_widgets ON DELETE SET NULL) — どの監視 widget が登録したか
- `source_entry_key` (TEXT) — scan reconcile の entry id (= `widget_item_hides.item_target` と同じ
  key 空間、 第1階層フォルダの **正規化済 絶対パス**)

自動登録経路 (`auto_register_folder_items` / `register_exe_item_on_conn` / `register_exe_items_bulk`)
は両列を埋め、 reconcile は両列の組で重複判定する (target パス一致に依存しない、 exe-folder
の key 空間ズレを橋渡し)。 片肺 (一方だけ NOT NULL) は契約違反 → audit query で検出する。

Library で監視アイテムを削除する経路 (`delete_item`) は、 削除前に
`widget_item_hides (widget_id=source_widget_id, item_target=source_entry_key)` を
`INSERT OR IGNORE` し、「user が意図的に削除した」 を記録する。 次の scan reconcile はこの
hide を見て entry を **skip し復活させない** (= モグラ叩き解消)。

監視 widget 自体を削除 → `widget_item_hides` 行は FK CASCADE で消え、 該当 item の
`source_widget_id` は `ON DELETE SET NULL` で「監視非由来 = user-owned 通常 item」 に降格し
Library に残る (user が明示的に削除しない限り)。 復元 UI (widget 設定の「除外したアイテム一覧」)
は PH-CF-500。

機械検出:

- 統合 test `test_projects_auto_register_delete_no_resurrection` / `test_exe_folder_auto_register_delete_no_resurrection`
- 統合 test `test_projects_auto_register_unhide_resurrects` (復元 UI の data model 検証)
- 統合 test `test_widget_delete_cascades_hides_and_sets_null_source`
- 統合 test `test_back_link_both_columns_filled_on_auto_register` (片肺 audit 0 violations)
- 統合 test `test_delete_item_user_owned_no_hide_recorded` (監視非由来は影響なし)
- `audit-source-back-link.sh` で片肺 back-link の DB 検出 + 監視自動登録経路に `find_by_target`
  残存が無いことを grep で検証

### launch 集計契約 (PH-CF-600 C3)

`launch_log.launched_at` は `launch_repository::record_launch_and_update_stats` で
`strftime('%Y-%m-%dT%H:%M:%SZ', 'now')` (ISO 8601 `T` 区切り + `Z` suffix) 形式で保存される。
期間集計クエリ (`get_library_stats` の `recent_launch_count` 等) は **同じ `strftime`
フォーマットで比較対象を生成** し、 SQLite 既定 `datetime()` (= スペース区切り) と混在させない。
位置 10 の `T` (0x54) vs space (0x20) で全 ISO 行が「>=」 と評価され境界が機能しなくなる。

#### 機械検出

- unit test `test_get_library_stats_recent_launch_count_respects_7d_boundary`: 7 日以内 3 件
  - 7 日超 2 件の launch_log fixture を仕込み `recent_launch_count == 3` を assert。
    境界外をカウントする回帰 (旧バグ = 5 件返す) は test fail。

### hidden item 取得契約 (PH-CF-600 C4)

tag 経由で item を取得する共有クエリ (`search_in_tag` / `cmd_search_items_in_tag`) は
`include_disabled: bool` 引数で `is_enabled = 0` の item を結果に含めるかを **明示制御** する。
クエリに `AND i.is_enabled = 1` をハードコード固定除外しない。

- `false` (default): hidden を除外 (= 従来の launcher 用途)
- `true`: hidden を含めて返す (Library 画面の「非表示を表示」 ON で grey-out 表示)

frontend IPC (`searchItemsInTag`) は `includeDisabled = false` を default に持ち、 Library 画面の
`loadItemsByTag` のみ `configStore.libraryShowHidden` 連動で `true` を渡す。 favorites widget /
palette / workspace picker / starred badge fetch は default false (= 従来挙動)。 共有クエリ
の挙動を変えるときは call-site matrix を読み直すこと (`src/lib/ipc/items.ts` の
`searchItemsInTag` doc comment)。

#### 機械検出

- unit test `test_search_in_tag_include_disabled_flag`: hidden item が `include_disabled=true`
  で含まれ、 `false` で除外されることを空 query と LIKE query 両経路で assert。

## 既知の判断

- label 空文字列は拒否 (InvalidInput)
- ORM 不使用 (rusqlite + 生 SQL)、UUID v7 で import/export の ID 衝突回避
- PH-CF-100 (2026-05-23) で監視アイテムの逆方向ライフサイクル data model 追加。 既存 item は
  source 列 NULL (= 監視非由来扱い)、 新規 scan 以降に有効。 backfill しない (folder_path から
  widget の逆引きが一意でないため安全側)。
