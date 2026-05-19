# 無駄処理 audit (Functional Spec ベース)

> 2026-05-19 実施。PR #525 で新設した機能 spec (`docs/l2_foundation/features/`) 全 45 件を読み、
> 「やらないこと」「性能予算」と現実装を突き合わせて spec 外 / 不要処理を棚卸し。

## 対処状況 (2026-05-19)

本 audit の **W-1〜W-8 全 8 件は同 PR で対処済**。あわせて再発防止の CI lint
`scripts/audit-async-commands.sh` を新設し、heavy I/O (filesystem walk / file open /
process spawn / HTTP) を行う `#[tauri::command]` が sync のまま追加されると lefthook /
`pnpm audit:all` で検出されるようにした。本ファイルは経緯記録として保持する。

| 項目 | 対処                                                                                         |
| ---- | -------------------------------------------------------------------------------------------- |
| W-1  | `launch_service::launch_item` の DB lock を DB read 後に解放、preflight / spawn は lock 外へ |
| W-2  | heavy I/O command 18 件を `async fn` + `spawn_blocking` 化 (#524 の横展開)                   |
| W-3  | exe scanner に `CancelRegistry` ベースの cancel token を導入 (`cmd_cancel_exe_scan`)         |
| W-4  | Item widget の no-op な `sort_field: 'recent'` option を UI から除去                         |
| W-5  | dead code `cmd_git_status` / `getGitStatus` wrapper を削除                                   |
| W-6  | dead code 単発 `cmd_get_item_metadata` / `getItemMetadata` wrapper を削除                    |
| W-7  | dead code `plugin_api` モジュールを削除                                                      |
| W-8  | System Monitor の legacy `chart_type` fallback を migration 037 とセットで撤去               |

## サマリ

- spec 外 / 契約逸脱の発見: **8 件**
- うち Critical 0 / High 2 / Medium 2 / Low 4
- 最重要は **#524 (Library freeze) と同根の「heavy I/O を sync command で main thread 上実行」が横展開されず残っている**こと。
  `cmd_get_items_metadata_batch` だけが async + `spawn_blocking` 化されたが、同種の file-walk / file-read / HTTP を行う command 群は依然 `pub fn` (sync) のまま。
- 推定削減効果:
  - **perf**: workspace 切替 / widget マウント時の main thread freeze 解消 (W-1 / W-2)。launch 中の DB lock 占有時間短縮 (W-1)。
  - **コード行数**: dead code 削除で約 100-150 行 (W-5 / W-6 / W-7)。
  - **認知負荷**: no-op な UI option (W-4) と legacy fallback (W-8) の除去で「動かない設定」「2 系統 config」の混乱を解消。

### 検証して clean だった項目 (誤検知防止のため明記)

| 項目                                         | 結論                                                                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 色派生の JS fallback (`color.ts`)            | spec 準拠。`cssColorToHex` 等は Settings の color picker でのみ使用、色派生は CSS native (`getComputedStyle` 委譲)。component / Library card からは未使用                                                       |
| PR #513 のタイプ別グラデーション計算         | 完全削除済。`artMap` 撤去、Library card に残骸なし (`typeAccentMap` は Palette でのみ使用、別用途)                                                                                                              |
| per-card `$effect` からの個別 IPC            | I3 で修正済。`LibraryCard.svelte` は IPC を持たず metadata は store cache read、warmup は batch (`metadataStore.loadMetadataForItems`)                                                                          |
| `backdrop-filter` 過剰適用                   | `arcagate-theme.css` の 2 クラス (`.ag-glass-clear` / `.ag-sticky-bar`) のみ。widget body 個別適用なし                                                                                                          |
| widget polling 間隔                          | clipboard (min 500ms) / system-monitor (min 500ms, default 2000ms) / projects git poll (default 60s) いずれも spec 下限を満たす。polling 禁止 widget (favorites/recent/stats/item 等) に `setInterval` 混入なし |
| widget の metadata/icon 自前 IPC             | favorites/recent/stats/item は itemStore cache read のみ。契約違反なし                                                                                                                                          |
| 旧 `max_items` config (daily-task / snippet) | migration 023 で除去済。dead code なし                                                                                                                                                                          |

---

## 発見項目

### W-1: `launch_item` が DB lock を握ったまま preflight stat + process spawn

- **重大度: High**
- **無駄度: 確実に無駄** (不要に lock 保持時間を延ばしている)
- 関連 spec: `docs/l2_foundation/features/cross-cutting/persistence.md` / `backend/launcher.md` / `backend/metadata-service.md`
- 該当コード: `src-tauri/src/services/launch_service.rs:43-108`
- spec で禁止されてること:
  - 永続化「重い処理を `Mutex<Connection>` を握ったまま実行しない (lock 解放後に I/O)」
  - Metadata Service「DB lock を握ったまま filesystem I/O をしない」
  - Launcher「item 起動 P95 ≤ 200ms」
- 現実装が実際にやってること:
  `launch_item` は冒頭 `let conn = db.0.lock()` (line 44) で**グローバル DB lock を取得し、関数末尾まで保持し続ける**。その lock 保持中に
  - `preflight_check` → `path.exists()` (line 26) = filesystem stat I/O
  - `launcher::launch_exe` / `launch_url` / `launch_script` / `launch_command` (line 70-94) = `Command::spawn` による OS process 起動
  - `opener_service::resolve_with_conn` (line 85)
    を実行している。
- なぜ無駄か:
  DB query (`find_by_id` / `is_item_confirmed`) が終わった後は lock は不要。にもかかわらず process spawn 完了まで lock を握り続けるため、その間 **他の全 IPC (検索 / metadata / tag count 等) が `Mutex<Connection>` を待たされる**。`path.exists()` が SMR HDD cold path だと数百ms〜秒級になりうる (#524 と同じ環境要因)。`record_launch_and_update_stats` の DB write のためだけに lock を再取得すれば十分。
- 推奨対処:
  DB read (item 取得 + confirm チェック) を 1 つの lock スコープに閉じ、`conn` を drop してから preflight + launcher を実行。起動ログ記録は別 lock スコープで。`launcher.md` の「log 記録は非同期、process 起動は DB transaction 外」の記述に実装を合わせる。
- 工数感: 〜1 時間

### W-2: heavy I/O を行う sync command が main thread を block (#524 の横展開漏れ)

- **重大度: High**
- **無駄度: 確実に無駄** (#524 で確立した対処が横展開されていない)
- 関連 spec: `docs/l2_foundation/features/cross-cutting/ipc-bridge.md` / `screens/workspace.md` / `backend/metadata-service.md`
- 該当コード (いずれも `#[tauri::command] pub fn` = sync、main thread 実行):
  - `src-tauri/src/commands/file_search_commands.rs:12` `cmd_list_files` — depth 1-3 / limit 5000 の filesystem walk
  - `src-tauri/src/commands/exe_scanner_commands.rs:5` `cmd_scan_exe_folders` — depth 1-3 walk
  - `src-tauri/src/commands/script_commands.rs:11` `cmd_scan_script_folder` — depth 1-3 walk
  - `src-tauri/src/commands/item_commands.rs:180` `cmd_auto_register_folder_items` — フォルダ scan + DB 一括登録
  - `src-tauri/src/commands/file_preview_commands.rs:8` `cmd_read_file_preview` — 最大 256KB の file open + read (対象 file の Defender scan 経路を踏む)
  - `src-tauri/src/commands/url_commands.rs:9` `cmd_fetch_url_title` — HTTP GET (5 秒 timeout) を同期実行
  - `src-tauri/src/commands/launch_commands.rs:46` `cmd_reveal_in_explorer` / `file_search_commands.rs:38` `cmd_open_path` — stat + `explorer.exe` spawn
  - 補助的: `export_commands.rs` の `cmd_export_json` / `cmd_import_json`、`bookmark_commands.rs:9` `cmd_parse_bookmark_file`、`workspace_commands.rs:159` `cmd_save_wallpaper_file`、`image_scrap_commands.rs:11` `cmd_save_image_scrap`
- spec で禁止されてること:
  - IPC Bridge「重い OS 呼び出し (PowerShell / Shell API / 大画像 decode) は `spawn_blocking` で逃がす」「backend 処理が >50ms 見込みなら frontend は非同期 + loading UI」
  - Workspace「workspace 切替 / page 切替時に全 widget の同期 IPC を一斉発火させない」「canvas 上で重い同期処理をしない」
- 現実装が実際にやってること:
  Tauri v2 では `async` でない command は **main thread (event loop thread) 上で実行**される。#524 はまさにこれが真因で、`cmd_get_items_metadata_batch` は async + `spawn_blocking` 化された。しかし**同種の file-walk / file-read / HTTP を行う他 command は依然 sync のまま**。`#[tauri::command] pub async fn` は `cmd_get_items_metadata_batch` と `cmd_extract_item_icon` の 2 件のみ。
- なぜ無駄か:
  watch 系 widget (File Search / Exe Folder / Script Folder / Projects) を含む workspace に切り替えると、widget マウント時に上記 sync command が main thread 上で発火する。深いフォルダや巨大ディレクトリで walk が秒級になると **アプリ全体が freeze** する (#524 と同じ症状)。`cmd_fetch_url_title` は URL の D&D 時に最悪 5 秒 UI が固まる。
- 推奨対処:
  #524 と同じパターン (`async fn` + `tauri::async_runtime::spawn_blocking`) を上記 command 群へ横展開。優先度は workspace マウント時に走る walk 系 (`cmd_list_files` / `cmd_scan_exe_folders` / `cmd_scan_script_folder` / `cmd_auto_register_folder_items`) → `cmd_read_file_preview` → `cmd_fetch_url_title` の順。`lessons.md` に「sync command の main thread block」を再発防止パターンとして追記推奨。
- 工数感: 半日〜1 日 (command ごとに async 化 + 動作確認、横展開で件数が多い)

### W-3: `cmd_scan_exe_folders` に cancel token が無い (File Search との非対称)

- **重大度: Medium**
- **無駄度: 多分無駄** (中断できない長い walk が走り続ける)
- 関連 spec: `docs/l2_foundation/features/widgets/exe-folder.md` / `backend/exe-scanner.md` / `backend/file-search-service.md`
- 該当コード: `src-tauri/src/commands/exe_scanner_commands.rs:5` / `src-tauri/src/services/exe_scanner_service.rs`
- spec で禁止されてること / 期待:
  exe-folder widget spec「scan を frontend で同期実行しない (backend に委譲、**cancel 可能**)」「file system scan は backend 側 IO heavy、**searchId で cancel 可能**」
- 現実装が実際にやってること:
  `cmd_list_files` (File Search) は `FileSearchState` + `AtomicBool` の cancel token を持ち、`cmd_cancel_file_search` で中断できる。一方 `cmd_scan_exe_folders` には cancel 機構が**全く無い**。frontend ExeFolderWatchWidget は `searchId` で stale response を破棄するだけで、backend の walk 自体は最後まで走り続ける。
- なぜ無駄か:
  widget で path / depth を変えると古い scan が backend で走り続け、CPU / disk I/O を無駄に消費する。spec が明記する「cancel 可能」契約に実装が達していない。
- 推奨対処:
  `file_search_service` の cancel token パターン (`AtomicBool` + state) を `exe_scanner_service` に流用。W-2 の async 化と同時に対処すると効率的。
- 工数感: 〜1 時間 (W-2 と同時なら追加 30 分程度)

### W-4: Item widget の `sort_field: 'recent'` が UI に出るが no-op

- **重大度: Medium**
- **無駄度: 確実に無駄** (動かない設定肢)
- 関連 spec: `docs/l2_foundation/features/widgets/item.md` (spec 自身が ⚠️ で言及)
- 該当コード:
  - `src/lib/widgets/item/ItemSettings.svelte:206` — `<option value="recent">` が選択可能
  - `src/lib/widgets/item/ItemWidget.svelte:88` — コメント「'recent' は将来 launch_log と連携予定、未対応時は manual と同等」、実際 manual と同じ元順序維持
- spec で禁止されてること:
  CLAUDE.md `<critical-rule id="instant-feedback">`「設定変えたら即見た目が変わる。遅延反映は欠陥」。item.md spec ⚠️「`sort_field: 'recent'` は現状 placeholder で manual と同等 (launch_log 連携は未実装)」
- 現実装が実際にやってること:
  Settings dialog で「最近起動順」を選べるが、選んでも manual と全く同じ並びになる。ユーザは「設定したのに変わらない = 壊れている」と受け取る。
- 推奨対処:
  2 択 — (a) launch_log 連携を実装して機能させる、(b) 実装しないなら option を UI から削除し型・コメントも整理。`daily-use-test` 哲学的には「動かない選択肢は削る」が妥当。Recent widget が既に最近起動順を提供しているため (b) でも機能欠落にならない。
- 工数感: (b) なら〜30 分 / (a) なら半日

### W-5: dead code — 単発 `cmd_git_status` + `getGitStatus` wrapper

- **重大度: Low**
- **無駄度: 確実に無駄** (呼び出し元ゼロ)
- 関連 spec: `docs/l2_foundation/features/widgets/projects.md`
- 該当コード:
  - `src-tauri/src/commands/workspace_commands.rs:133` `cmd_git_status` (単発版)
  - `src/lib/ipc/workspace.ts:97` `getGitStatus` (TS wrapper、定義のみ・呼び出し元なし)
- spec で禁止されてること:
  projects.md「git status を 1 フォルダずつ個別 IPC で取らない (必ず batch)」
- 現実装が実際にやってること:
  ProjectsWidget は `cmd_get_git_statuses_batch` に完全移行済 (`ProjectsWidget.svelte:122` のコメントが「旧実装は各 folder ごと `cmd_git_status` を発火」と明記)。単発 `cmd_git_status` と `getGitStatus` wrapper は全コードベースで参照ゼロ。
- なぜ無駄か:
  使われない command / wrapper がビルドに含まれ、「個別 git status を取る経路」が存在するかのような誤解を残す。
- 推奨対処: `cmd_git_status` と `getGitStatus` を削除 (invoke handler 登録も)。
- 工数感: 〜15 分

### W-6: dead code — 単発 `cmd_get_item_metadata` + `getItemMetadata` wrapper

- **重大度: Low**
- **無駄度: 確実に無駄** (呼び出し元ゼロ)
- 関連 spec: `docs/l2_foundation/features/backend/metadata-service.md` / `screens/library.md`
- 該当コード:
  - `src-tauri/src/commands/metadata_commands.rs:8` `cmd_get_item_metadata` (単発版)
  - `src/lib/ipc/items.ts:50` `getItemMetadata` (TS wrapper、定義のみ・呼び出し元なし)
- spec で禁止されてること:
  library.md「per-card の `$effect` から個別 IPC を呼ばない (metadata は store で 1 回 batch fetch + cache)」
- 現実装が実際にやってること:
  per-card 個別取得経路は I3 修正で `cmd_get_items_metadata_batch` に置換済。単発 `cmd_get_item_metadata` / `getItemMetadata` wrapper は参照ゼロ (複数 file の言及はすべて「旧実装の per-card 呼び出しを排除した」というコメント)。
- なぜ無駄か:
  使われない単発 metadata 経路が残っていると、まさに #524 を招いた「per-card 個別 IPC」を再導入する誘惑が残る。dead code として除去すれば構造的に再発を防げる。
- 推奨対処: `cmd_get_item_metadata` (単発) と `getItemMetadata` wrapper を削除。batch のみを唯一経路にする。
- 工数感: 〜15 分

### W-7: dead code — `plugin_api` モジュール全体

- **重大度: Low**
- **無駄度: 議論余地あり** (将来 CLI/MCP plugin 用の足場の可能性)
- 該当コード: `src-tauri/src/lib.rs:5-6` (`#[allow(dead_code)] mod plugin_api;`)、`src-tauri/src/plugin_api/` (`mod.rs` / `command_provider.rs` / `item_provider.rs` / `plugin.rs`)
- spec で禁止されてること:
  直接の spec 契約はない。security-model.md は「CLI / MCP 経由の起動」に触れるが、それは `arcagate_cli.rs` 側で実装されており `plugin_api` モジュールは参照していない。
- 現実装が実際にやってること:
  `plugin_api` は `mod plugin_api` (非 `pub`) で宣言され `#[allow(dead_code)]` が明示的に付いている。コードベース全体で `lib.rs` の mod 宣言以外に参照が無い。CLI binary (`arcagate_cli.rs`) は `arcagate_lib` の public API を使うが、`plugin_api` は private なのでそもそも到達不能。
- なぜ無駄か (議論余地):
  `#[allow(dead_code)]` が付いていること自体「未使用と認識しつつ放置」の状態。今後 plugin 機構を作る予定があれば足場として残す判断はありうるが、`motivation.md` の Non-goal 次第。
- 推奨対処:
  plugin 機構の実装予定を確認し、(a) 予定なし → モジュール削除、(b) 予定あり → spec / motivation に「将来の plugin API 足場」と明記して `#[allow(dead_code)]` の理由を残す。`feedback_do_it_now_philosophy` に従えば「予定が無いなら今削る」。
- 工数感: 〜15 分 (削除する場合)

### W-8: System Monitor の legacy `chart_type` fallback

- **重大度: Low**
- **無駄度: 議論余地あり** (旧 config 後方互換)
- 関連 spec: `docs/l2_foundation/features/widgets/system-monitor.md` (spec 自身が ⚠️ で言及)
- 該当コード:
  - `src/lib/widgets/system-monitor/SystemMonitorWidget.svelte:60` (`chart_type?` 型) / `:86-90` (3+1 箇所の `?? config.chart_type ??` fallback)
  - `src/lib/widgets/system-monitor/SystemMonitorSettings.svelte:20` / `:36-39` (同 fallback)
- spec で禁止されてること:
  直接の禁止ではないが system-monitor.md ⚠️「metric ごとの show/chart_type config が多く、legacy `chart_type` との fallback で複雑。整理は別 issue 候補」と spec 自身が課題認定。
- 現実装が実際にやってること:
  per-metric の `cpu_chart_type` 等に移行済だが、旧共通 `chart_type` を中間 fallback として保持。現行 Settings UI は per-metric key しか書き込まない (`SystemMonitorSettings.svelte:120/140/160/180`) ため、`config.chart_type` に値が入るのは 4/30 以前に保存された古い widget config のみ。
- なぜ無駄か (議論余地):
  新規ユーザ / 新規 widget では `chart_type` は常に `undefined` で fallback は実質 dead branch。ただし旧 config を持つ既存ユーザ (= 開発者自身) の widget が 1 度 Settings を開いて保存し直すまでは効いている。
- 推奨対処:
  one-shot migration (旧 `chart_type` → 各 `*_chart_type` へ展開してから `chart_type` key を削除) を 1 本入れ、その後 fallback コードと型定義を除去。migration なしで fallback だけ消すと旧 config の widget が default に戻るため非推奨。
- 工数感: 〜30 分 (migration + fallback 除去)

---

## 補足: audit の進め方についての所見

- 各 backend command の sync/async は機械判定できる (`pub async fn` は 2 件のみ)。pre-commit hook / CI で「filesystem walk / file open / Command::spawn / HTTP を含む `#[tauri::command]` が `async` か」を機械検出できれば W-2 系の再発を構造的に防げる (design-tokens hook と同じ発想)。
- spec の「性能予算」セクションに「sync command か async か」を明記する欄を追加すると、W-2 のような契約逸脱が spec ↔ 実装 diff で即見える。

## 関連

- 真因 doc: `docs/l2_foundation/features/README.md` (#524 の経緯)
- 機能 spec: `docs/l2_foundation/features/`
- 失敗駆動メモリ: `docs/l2_foundation/lessons.md` (W-2 の再発防止パターン追記を推奨)
