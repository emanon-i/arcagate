# Exe Scanner Service

> backend feature / レイヤー: commands → service → filesystem

## 目的

指定フォルダ配下の対象ファイル (実行ファイル / スクリプト / 任意拡張子) を列挙し、Exe Folder Watch widget へ候補を提供する backend feature。

## やること (必要処理)

- `scan_exe_folders_with_cancel`: 呼び出し側指定の `extensions` (大文字小文字 / 先頭 `.` 不問) と `scan_depth` (1..=10) でフォルダを walk
- Root 直下の **第1階層フォルダ** ごとに 1 entry を生成 (= scan の identity 単位)
- 第1階層フォルダごとに「浅い階層優先 → 同一階層はサイズ大優先」 で 1 ファイルを **default 選択**、 同階層内の全候補を `exe_candidates` に最良順で返す (フロントの popover が他候補に切替可能)
- 同フォルダの `.ico` (先頭 1 件) を `icon_path` に提供
- ソート用にフォルダの mtime を返す
- symlink は follow しない (= ループ回避)、 permission denied / IO error は該当ディレクトリを skip して走査継続

## やらないこと (禁止 / scope 外)

- exe を実行しない (列挙のみ。起動は [Launcher](./launcher.md))
- icon を抽出しない ([Icon Service](./icon-service.md) / 登録時の責務)
- ファイル read 失敗で全体を止めない (該当ファイルを skip)
- 監視拡張子をハードコードしない (呼び出し側 `extensions` で指定)
- symlink / junction を follow しない (= ループ無限再帰防止)

## 性能予算

- depth 上限 `MAX_SCAN_DEPTH = 10` + error tolerance で有界。 file metadata の stat のみ

## 副作用 (state 変化 / persistence)

- なし (read-only。filesystem walk のみ)

## 依存

- 外部 crate なし
- 依存される: Exe Folder Watch widget

## 機能契約

### EXE フォルダ検出契約 (PH-CF-400)

scan の entry 単位は **Root 直下の第1階層フォルダ**。 1 第1階層フォルダ = 最大 1 entry。
entry のラベルは第1階層フォルダ名、 entry の **identity は第1階層フォルダの正規化済
絶対パス** (forward slash / 末尾 separator 除去) で、 `widget_item_hides.item_target` /
`items.source_entry_key` と同 key 空間 (hide / override 設定がこれに紐づくため安定で
なければならない)。 列挙順は deterministic (第1階層フォルダ path 昇順)。 配下を
`scan_depth` まで探索し対象ファイルを収集、 「**浅い階層優先 → 同一階層はサイズ大優先**」
で 1 ファイルを default 選択 (= `exe_candidates[0]`)。 対象ファイル 0 件の第1階層
フォルダは entry を生成しない。 監視拡張子は呼び出し側が `extensions: Vec<String>` で
指定し、 scanner にハードコードしない。 symlink ループ・permission denied で panic /
無限再帰してはならない。

機械検出 (`exe_scanner_service::tests`):

- `first_level_folder_yields_single_entry_even_with_nested_targets` — 重複ラベル 0 / 第1階層数 = entry 数
- `shallower_file_wins_over_deeper_larger` — 浅い階層優先
- `same_depth_picks_largest` — 同階層サイズ大優先
- `first_level_without_target_is_skipped` — 対象 0 件は entry なし
- `extensions_filter_blend_only` / `extensions_normalize_dot_and_case` — 拡張子フィルタ + 正規化
- `does_not_follow_symlinks_no_infinite_recursion` — symlink を follow しない
- `permission_denied_dir_is_skipped_no_panic` — IO error / read denied で skip 継続
- `entry_id_is_normalized_absolute_path` / `entries_are_sorted_deterministically` — identity 安定 + deterministic 順序

### scan reconcile 契約 (PH-CF-100)

scan entry の重複判定は **`(widget_id, entry_key)`** で行う (target パス一致ではない —
exe-folder では item.target = 選択された対象ファイルパス ≠ entry_key = 第1階層フォルダで
key 空間が異なる)。 entry が `widget_item_hides` に存在すれば自動登録を **skip** し、
復活させない。 entry_key は第1階層フォルダの **正規化済 絶対パス** で、 同フォルダの
異表現で 2 重登録 / hide 不発を起こさない (item-service spec の所有関係契約と同 key 空間)。

機械検出:

- 統合 test `test_exe_folder_auto_register_delete_no_resurrection` (entry_key 一致 / hide 連動)
- 統合 test `test_normalize_entry_key_consolidates_path_variants` (path 正規化)
- 統合 test `test_register_exe_items_bulk_entry_keys_fallback_to_parent` (PH-CF-400 entry_keys None back-compat)

### scan キャッシュ契約 (PH-CF-900 A1-4)

exe scan の結果は **DB (`exe_scan_cache` table) にキャッシュする**。 widget mount 時は
キャッシュを即表示し、 cold walk (~10s+、 W-2 / W-9 audit 参照) を UI 経路でブロックしない。
背景で fresh scan を走らせ、 完了後に entries を上書き + cache に persist する。

cache key は **`<watch_path 正規化>|<scan_depth clamp 後>|<extensions 正規化 + ソート>`**
の文字列で、 backend (`exe_scanner_service::build_scan_cache_key`) が合成する:

- watch_path: forward slash + 末尾 separator 除去 (`normalize_folder_path` と同 logic)
- scan_depth: `1..=MAX_SCAN_DEPTH` (= 10) に clamp
- extensions: 小文字 + 先頭 `.` 除去 + 空除去 + dedup + 昇順ソート

これにより `C:\Games\` と `C:/Games` / `.EXE` と `exe` 等の表記ゆらぎが同 key に収束し、
偽の cache miss を防ぐ。

#### invalidation

- **入力変化**: watch_path / scan_depth / extensions のいずれかが変わると key が変化し、
  別 row として cache miss → fresh scan が走り新 key で persist される (= 自然 invalidate)
- **明示 invalidate**: `cmd_invalidate_exe_scan_cache` で同 key を delete (watcher の
  ファイル変更検知時 / user 強制 refresh 時の force-refresh 経路用)
- **fresh scan で常に上書き**: mount 時は cache hit を即表示 + fresh scan 並行実行 +
  完了後 cache 上書きを必ず行うため、 「永遠に古い cache を出し続ける」 状況は発生しない

#### 機械検出

- Rust unit `cache_key_is_stable_for_same_inputs` / `cache_key_normalizes_watch_path` /
  `cache_key_normalizes_extensions` / `cache_key_clamps_depth` / `cache_key_invalidates_on_any_input_change`
  — key 合成の正規化と invalidation 条件
- Rust unit `cache_round_trip_persists_entries` / `cache_invalidate_clears_entries` /
  `cache_keys_do_not_collide` — DB persist の round-trip と key 単位の隔離
- e2e: `tests/perf/exe-scan-cache.spec.ts` で「2 回目 mount の scan が cache hit になり
  cold walk が走らない」 を verify (= 起動 perf 寄与の回帰検出)

## 既知の判断

- U-4 で script 拡張子 (.bat / .cmd / .ps1 / .sh) も scan 対象に含む (default extensions に追加)
- PH-CF-100 (2026-05-23) で reconcile を所有関係ベース (`source_widget_id, source_entry_key`)
  に切替、 `widget_item_hides` skip を契約化
- PH-CF-400 (2026-05-23) で walk を「ディレクトリ単位 entry」 から「第1階層フォルダ単位 entry」
  に再設計。 監視拡張子をハードコードから引数化、 階層上限を 3 から `MAX_SCAN_DEPTH=10` に緩和。
  exe-folder の安定 identity (= 第1階層フォルダの正規化済 絶対パス) を契約化
