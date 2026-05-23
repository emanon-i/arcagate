---
id: PH-CF-100
status: planning
batch: clean-feedback
type: バグ修正
era: Distribution Hardening
parent: README.md
---

# PH-CF-100: workspace ↔ Library 参照整合 + 監視アイテムの逆方向ライフサイクル

## 元 user fb (検収項目)

- **E4**: ワークスペースのタブを消すと必ず右下にエラーが出る → 直す
- **E5**: workspace 削除後も Library アイテムが孤立して残り、 後で設定変更すると `ItemNotFound` エラーになる
- **監視アイテムの逆方向ライフサイクル** (E6 検討中に判明、 user 承認済): 監視ウィジェット (フォルダ監視 / EXE フォルダ監視) が自動登録した Library アイテムを user が Library から削除しても、 現状は次の scan で無言で復活する (モグラ叩き状態)。 「削除した意図」 を記録して復活させない data model を整える

## 問題

workspace に item を載せる参照経路が **2 系統** あり、 両者が同期していない:

1. **`sys-ws-<id>` tag 経路** — `workspace_id` 付きで `create_item` / `create_items` を呼んだ item に `sys-ws-<id>` tag が自動付与される (`item_service.rs:383-396` / `476-489`)。 workspace 削除の cascade DELETE はこの tag を見て item を消す
2. **widget config JSON の `item_ids` 経路** — `item` widget に `LibraryItemPicker` で既存 Library item を追加すると、 widget config JSON の `item_ids` に id が入るだけ。 `create_item` を通らないので **`sys-ws-<id>` tag が付かない**

この非同期が E4 / E5 双方の根。

## 引用元 guideline doc

| Doc                                                        | Section                              | 採用判断への寄与                                |
| ---------------------------------------------------------- | ------------------------------------ | ----------------------------------------------- |
| `docs/l2_foundation/foundation.md`                         | レイヤー設計 / SQLite schema         | cascade は service 層で、 Repository 直呼び禁止 |
| `docs/l2_foundation/features/backend/workspace-service.md` | workspace 削除                       | cascade の正しい対象集合の定義                  |
| `docs/l2_foundation/features/backend/item-service.md`      | item ライフサイクル                  | item の孤立を作らない契約                       |
| `docs/l0_ideas/motivation.md`                              | 失敗パターン                         | データを失わない / 壊れた参照を残さない         |
| `CLAUDE.md`                                                | `<critical-rule id="lateral-sweep">` | 参照経路 2 系統を両方 audit                     |

## Fact 確認 (root cause)

### E5: 孤立 item → ItemNotFound

`workspace_service.rs:87-110` `delete_workspace`:

```rust
conn.execute(
    "DELETE FROM items WHERE id IN (\
         SELECT item_id FROM item_tags WHERE tag_id = ?1\
     ) AND id NOT IN (\
         SELECT item_id FROM item_tags WHERE tag_id LIKE 'sys-ws-%' AND tag_id <> ?1\
     )",
    rusqlite::params![tag_id],
)?;
```

→ cascade DELETE は `sys-ws-<id>` tag が付いた item しか消さない。 `LibraryItemPicker` で widget に追加された既存 item は tag を持たないため **cascade に引っかからず Library に残留**。 逆に、 widget config JSON の `item_ids` が cascade で消えた item を指したまま残るケースもある。

孤立した item を後で設定変更 → `item_repository.rs:163` 付近の `find_by_id` が `Err(AppError::NotFound)` を投げる。

`sys-ws-*` tag 付与経路は `item_service.rs:383-396` / `476-489` (`workspace_id` 付き create のみ)。 既存 item を widget に追加する経路 (`ItemWidget.svelte:116-148` `pickerSelectMany/Single` → `updateWidgetConfig`) は tag を付けない。

### E4: タブ削除で必ずエラートースト

- フロント `workspace-config.svelte.ts:87-109` `deleteWorkspace` は `try/catch` で error を `this.error` に格納するだけ。 `workspace-config` の `error` を toast 化する watcher は存在しない (grep 確認済)。 `PageTabBar.svelte:53` も `void workspaceStore.deleteWorkspace(id)` で内部 catch 済 → ここからは unhandled rejection は出ない
- 「右下のエラー」 の正体は `error-monitor.svelte.ts:53-67` — `window` の `unhandledrejection` / `error` イベントを捕捉し `toast.unexpected_error` を出す共通機構。 つまり **タブ削除後の再描画経路のどこかで Promise が unhandled reject している**
- 最有力候補: 削除後 `workspace-config.svelte.ts:96` で次 workspace の widget を再ロード → 旧 workspace の widget が unmount される過程で、 (a) 進行中の scan promise が cancel reject する、 (b) `image_scrap` / `item` widget の `$effect` が cascade 削除済 item を `find_by_id` して reject する、 のいずれか。 ItemWidget は missing item を黙って除外する (`ItemWidget.svelte:84-86`) ため、 (a) cancel reject か (b) の picker 追加 item (= E5 の孤立) が有力

→ E4 は E5 と同根 (孤立参照) + unhandled rejection が toast 化される経路。 **本 PH の最初のタスクは agent dev + CDP console で `[error-monitor]` ログを 1 回取得し、 reject している正確な呼び出しを特定すること**。

### E4 / E5 — frontend itemStore の stale cache (Codex クロスチェックで追加判明)

Codex の独立調査で、 E5 の `ItemNotFound` 部分には **もう 1 つの根** があることが判明した。 `workspace_service.rs:93-107` の cascade DELETE は `sys-ws-*` tag 付き item を **DB から実際に削除する**。 しかしフロント `workspace-config.svelte.ts:87-109` の `deleteWorkspace` は **`itemStore` を refresh しない**。 結果、 cascade で DB から消えた item がフロントの `itemStore` キャッシュに残り、 user がその ghost item の設定を開く → `launch_service.rs:51` / `find_by_id` が `AppError::NotFound` を返す。

つまり E5 の symptom は 2 つの欠陥の合成:

- **「孤立して残り」** = `LibraryItemPicker` 追加 item は tag 非付与 → cascade に引っかからず DB に**真の孤立**として残留
- **「ItemNotFound エラー」** = cascade が**削除した** item についてフロント `itemStore` が stale → ghost item の設定操作で NotFound

当初 plan は前者のみを扱っていた。 後者 (stale cache) も本 PH で直す。

### 監視アイテムの逆方向ライフサイクル — data model 整備

監視ウィジェット (フォルダ監視 = `projects` / EXE フォルダ監視 = `exe_folder`) は scan で見つけた対象を **Library アイテムとして自動登録** する (`ProjectsWidget.svelte:223` → `cmd_auto_register_folder_items` → `item_service.rs:316,379` insert / `ExeFolderWatchWidget.svelte:186` → `register_exe_items_bulk` → `item_service.rs:500,422,473` insert)。 一方 user が Library 画面でその監視アイテムを削除しても、 次の scan で **新 UUID で無言で再 insert される** (= モグラ叩き)。

調査で判明した穴 (#2 調査結果より):

- 監視アイテムに「どの監視ウィジェット由来か」 を示す **back-link が存在しない**。 `items.is_tracked` は watched_path 配下フラグであって widget 単位の所有関係ではない。 reconcile はすべて target パス一致 (`find_by_target`) — 「user 削除済」 と「未登録」 を区別できない
- 「user が意図的に削除した」 を記録する仕組みが **無い**。 既存の `widget_item_hides` (`029_widget_item_hides.sql`) は widget 右クリック「この widget から外す」 専用で、 Library 削除と一切連動しない (`item_target` 列に `items` への FK も無し)
- `widget_item_hides` の **key 空間ズレ** (exe-folder): hide key は scan entry id (= 1st-level folder path) だが、 登録される item.target は exe ファイルパス。 両者が一致せず、 Library 削除と hide の橋渡しができない (フォルダ監視は item.target = folder path = entry key で一致しているので問題なし)
- 削除カスケード: `cmd_delete_item` → `item_service.rs:151-155` は `cascade_remove_item_from_widgets` で widget config の `item_id`/`item_ids` キーのみ strip。 監視 widget の config (`watched_folder` / `watch_path` / `item_overrides`) は触らず、 監視アイテム由来の削除は監視 widget に何も伝播しない

### 確定方針 (2026-05-23 user 承認)

- 監視ウィジェット (フォルダ監視 / EXE フォルダ監視) 由来の Library アイテムを user が削除したら、 当該監視ウィジェットの **除外リストに記録し、 次の scan で復活させない**
- 復元導線: 監視ウィジェット設定に「除外したアイテム一覧」 を置き、 そこから復元できる (widget を作り直さなくて済む) — **UI は PH-CF-500**
- 監視ウィジェットごと削除した場合は除外リストも消える (現行 `widget_id` FK CASCADE で実現済)
- 土台は既存の `widget_item_hides` を使うが、 上記の穴を直す
- スクリプト監視 (`script_folder`) は Library に永続化しないため対象外

## スコープ

- workspace 削除 / タブ削除の cascade を **参照経路 2 系統の両方** を見るよう再設計
- 孤立 item を生まない / 残さない
- cascade DELETE 後にフロント `itemStore` を refresh し、 stale cache の ghost item を残さない
- タブ削除後の unhandled rejection を握り、 `toast.unexpected_error` が出ないようにする
- 監視アイテムの逆方向ライフサイクル: 監視アイテムに **所有関係 back-link** を持たせる / Library 削除を **widget 除外リストに記録** / **reconcile を所有関係ベース** に / widget 削除でカスケード — を data model レベルで整える (復元 UI は PH-CF-500)

## やらないこと

- E6 (タブ削除確認モーダルに「アイテムも消す」 チェックボックス) — UI は PH-CF-300。 本 PH は backend の cascade 基盤と「アイテムを消すか残すか」 を選択可能にする `delete_items: bool` 必須引数の追加までを担う
- workspace D&D 配置 (E1) — PH-CF-200
- 監視ウィジェット設定の **「除外したアイテム一覧」 復元 UI** — PH-CF-500 (本 PH は除外を記録する data model と reconcile までを担う)
- スクリプト監視 (`script_folder`) の逆方向ライフサイクル対応 — Library に永続化しないため対象外

## 具体タスク

1. **reject 特定**: agent dev で workspace にタブを作り widget を載せて削除、 CDP console の `[error-monitor]` ログから reject 元の呼び出しを file:line で特定。 doc に追記
2. **参照集合の一本化**: 「workspace 配下の item 参照集合」 を 1 クエリで返す関数を `workspace_repository.rs` に新設 — `sys-ws-<id>` tag の item ∪ 当該 workspace の全 widget config JSON の `item_ids`。 widget config は JSON なので、 Rust 側で workspace の widget 一覧 → config パース → `item_ids` 収集
3. **cascade の再設計 (トランザクション化)**: `workspace_service.rs:87-110` `delete_workspace` を、 上記参照集合のうち「他 workspace から参照されない item」 のみ削除するよう書き換え。 workspace / item / tag / widget config 参照の削除を **1 トランザクション** で行い、 途中失敗で中途半端な状態を残さない。 `delete_items: bool` 引数を追加 (PH-CF-300 / E6 が使う)
4. **`cmd_delete_workspace` シグネチャ拡張**: `workspace_commands.rs` と `src/lib/ipc/workspace.ts` に `delete_items: bool` を **必須フィールド** として追加 (Codex review: implicit default は recurrence-unsafe — 省略時はコンパイル/型エラーで気づける必須引数にする)。 既存呼び出しは明示的に `false` を渡す
5. **frontend itemStore の refresh**: `workspace-config.svelte.ts:87-109` の `deleteWorkspace` で、 cascade 完了後に `itemStore` を再ロードし stale cache を解消 (E4/E5 の ghost item 経路)
6. **reject 元の握り**: タスク 1 で特定した呼び出しに `try/catch` (または cancel エラーの判別と無視) を入れ、 unhandled rejection を解消。 cancel reject なら「cancel は正常系」 として toast を出さない
7. **孤立検出 audit query**: 「どの workspace tag も持たず、 どの widget config からも参照されない宙ぶらりん item」 / 「widget config が指す存在しない item id」 を検出する SQL を作り、 reset_service か専用 audit に組み込む

### 監視アイテムの逆方向ライフサイクル data model

8. **back-link 列を `items` に追加** (新規 migration、 現行最終の次番号):
   - `items.source_widget_id TEXT NULL REFERENCES workspace_widgets(id) ON DELETE SET NULL` — どの監視 widget が自動登録したか (NULL = user 作成 / 監視非由来)
   - `items.source_entry_key TEXT NULL` — scan reconcile の entry id。 exe-folder では PH-CF-400 §A の **第1階層フォルダの正規化済 絶対パス** / projects ではサブフォルダの正規化済 絶対パス。 `widget_item_hides.item_target` と **同じ key 空間** で揃える
   - 既存 `items` 行は NULL (= 監視非由来扱い)。 自動登録経路 (`item_service.rs:344-400` `auto_register_folder_items` / `:422` `register_exe_item_on_conn` / `:500` `register_exe_items_bulk`) を変更し、 insert 時に両列を埋める
9. **`widget_item_hides` の semantic 整備**:
   - 列名 `item_target` は維持 (data 互換性のため) し、 doc 上のセマンティクスを **scan entry key** と明示。 既存データは exe-folder = folderPath / projects = item.target=folder path で既に entry-key shape — data migration 不要
   - `029_widget_item_hides.sql` の comment + features spec に「`item_target` 列は scan entry id (正規化済 絶対パス)、 item id でも item.target でもない」 と注記
   - exe-folder の key 空間ズレ (item.target=exePath vs hide key=folderPath) は、 タスク 8 の `source_entry_key` を介して橋渡しする (item からは `source_entry_key` を、 hide からは `item_target` を、 ともに同じ entry key として参照)
10. **Library 削除時の自動除外記録**: `cmd_delete_item` → `item_service.rs:151` `delete_item` の冒頭で、 削除対象 item の `source_widget_id` / `source_entry_key` を読み、 両方が NOT NULL なら `widget_item_hides` に `INSERT OR IGNORE (widget_id=source_widget_id, item_target=source_entry_key)`。 その後で既存の cascade + delete を実行
11. **reconcile を所有関係ベースへ**: `auto_register_folder_items` / `register_exe_item_on_conn` の重複判定を `find_by_target` から **`(source_widget_id, source_entry_key)` 一致** に切替。 さらに新規 insert 前に `widget_item_hides` をチェックし、 該当 (widget_id, entry_key) が存在すれば skip。 これで「削除済 entry は復活させない」 が成立
12. **widget 削除時のカスケード**: `workspace_widgets` 行が削除されると `widget_item_hides.widget_id` FK CASCADE で除外行も消える (既存挙動)。 加えて `items.source_widget_id` は `ON DELETE SET NULL` なので、 監視 widget が消えた item は「監視非由来 = user-owned 通常 item」 に降格し Library に残る (user が明示的に削除しない限り)
13. **新規 audit**: `items` に `source_widget_id` だけ NOT NULL / `source_entry_key` だけ NULL のような不整合 (= 片肺 back-link) が無いか検出する SQL を加える

## 受け入れ条件 (機械検出)

- [ ] Rust 統合 test: workspace に (a) `workspace_id` 付き create した item, (b) `LibraryItemPicker` 相当で widget config に id 追加した既存 item, (c) `image_scrap` 等の mixed widget payload を載せ、 workspace 削除後に **孤立 item が 0 / dangling な widget config 参照が 0** であること
- [ ] Rust unit test: `delete_items` を **両分岐** で検証 — `false` で workspace 削除 → item は Library に残る / `true` → 他 workspace 非参照の item は消える。 `cmd_delete_workspace` で `delete_items` 省略がコンパイル/型エラーになること
- [ ] e2e: タブ削除後にフロント `itemStore` が refresh され、 削除済 item の設定を開いても `ItemNotFound` が出ない (stale cache 解消)
- [ ] e2e: タブを作成 → widget 配置 → タブ削除、 `toast.unexpected_error` トーストが **出ない** こと
- [ ] 孤立検出 audit query が既存 DB に対して 0 violations
- [ ] Rust 統合 test (逆方向ライフサイクル): フォルダ監視 / EXE フォルダ監視で自動登録された item を Library から削除 → 同 widget の再 scan で **復活しない** (新 UUID 行が増えない)
- [ ] Rust 統合 test: 同 entry を `widget_item_hides` から手動で削除 → 次の scan で **再登録される** (復元導線の data model 側が機能)
- [ ] Rust unit test: 監視 widget を削除 → 該当 `widget_item_hides` 行が CASCADE で消える / 該当 item の `source_widget_id` が SET NULL になり Library に残る
- [ ] Rust unit test: 自動登録経路の insert で `(source_widget_id, source_entry_key)` 両方が埋まる。 片肺 back-link を検出する audit query が 0 violations
- [ ] reconcile が `find_by_target` でなく `(source_widget_id, source_entry_key)` で重複判定されている (grep 0 で `find_by_target` 残存ゼロ in 監視自動登録経路)

## 機能契約の追記

`features/backend/workspace-service.md`:

> **workspace 削除の cascade 契約**: workspace 配下の item 参照は `sys-ws-<id>` tag と widget config JSON `item_ids` の 2 経路がある。 cascade はこの **和集合** を対象集合とし、 「他 workspace から参照されない item」 のみ削除する。 workspace / item / tag / widget config 参照の削除は **1 トランザクション** で行う。 削除有無は `delete_items` (必須引数、 implicit default を持たない) で制御する。 cascade 後に孤立 item / dangling 参照を残してはならず、 フロント `itemStore` も同時に refresh して stale cache を残さない。

`features/backend/item-service.md`:

> **item 参照整合契約**: item を削除する全経路の後、 その item を指す widget config `item_ids` は同一トランザクション内で除去するか、 参照側が missing id を graceful に skip する。 `find_by_id` の `NotFound` を UI 操作経路で握りつぶさず toast 化してよいのは「ユーザーが今まさに開いた item が消えていた」 例外時のみ。
>
> **監視アイテムの所有関係契約**: 監視ウィジェット由来の item は `(source_widget_id, source_entry_key)` の back-link を必ず持つ。 自動登録経路は両列を埋め、 reconcile は両列の組で重複判定する (target パス一致に依存しない)。 Library で監視アイテムを削除する経路は、 削除前に `widget_item_hides (widget_id=source_widget_id, item_target=source_entry_key)` を `INSERT OR IGNORE` し、 「user が意図的に削除した」 を記録する。

`features/backend/exe-scanner.md` (PH-CF-400 の契約に追記):

> **scan reconcile 契約**: scan entry の重複判定は `(widget_id, entry_key)` で行う。 entry が `widget_item_hides` に存在すれば自動登録を skip し、 復活させない。 entry_key は第1階層フォルダの正規化済 絶対パス (PH-CF-400 §安定 identity 契約と整合)。

`features/widgets/_chrome-consistency.md` または各監視 widget の spec (`projects.md` / `exe-folder.md`):

> **監視ウィジェットの除外契約**: 自動登録した Library item が user に削除されたら、 当該 widget の除外リスト (`widget_item_hides`) に entry_key を記録し、 再 scan で復活させない。 widget 自体を削除すると除外リストは CASCADE で消える (fresh state)。 除外を解除する復元 UI は widget 設定に置く (UI 仕様は PH-CF-500)。

機械検出: 上記 audit query を `scripts/audit-*.sh` 相当に追加し CI で実行。 逆方向ライフサイクルは §受け入れ条件 の統合 test (削除→再 scan で復活しない / 除外解除で復活する) で常設検証。

## 横展開

- `image_scrap` widget の D&D 追加 item も tag を付けないため E5 と同型 — 参照集合一本化で同時に解消されることを確認
- `bulkAddItemWidgets` 経路 (`workspace-widgets.svelte.ts`) も既存 item を載せる経路。 同じく tag 非付与かを確認
- 他に `find_by_id` の `NotFound` が UI で toast 化される経路がないか grep
- 監視自動登録経路 (`item_service.rs:344-400` / `:422` / `:500`) すべてで back-link 列を埋めること。 1 経路漏れると逆方向ライフサイクルが破綻 — 自動登録 IPC を `cmd_auto_register_folder_items` / `cmd_scan_exe_folders` (→ `register_exe_items_bulk`) で grep し全件 audit
- exe-folder の hide 既存 key (folderPath) と再設計後の entry_key (PH-CF-400 の正規化済 絶対パス) が一致するか back-compat test (PH-CF-400 のタスク 5 と統合)

## 工数感

| Task                                                               | 工数     |
| ------------------------------------------------------------------ | -------- |
| reject 特定 (agent dev + CDP)                                      | 0.5 日   |
| 参照集合一本化 + cascade 再設計 + IPC 拡張                         | 2-3 日   |
| reject 握り + audit query                                          | 1 日     |
| 逆方向ライフサイクル migration (back-link 列追加) + 自動登録改修   | 2-3 日   |
| reconcile を所有関係ベースに / Library 削除→hide 記録 / カスケード | 1.5 日   |
| unit / 統合 / e2e test                                             | 2-2.5 日 |

合計: 約 2 週間 (逆方向ライフサイクル分が追加で +1 週間)。

## 依存・着手順

- **先行**: なし。 本 batch の先頭
- **後続**:
  - PH-CF-300 (E6) が本 PH の `delete_items` 引数を前提にする
  - **PH-CF-500 (監視ウィジェット)** が本 PH の `widget_item_hides` セマンティクス + back-link 列を前提に、 復元 UI を載せる
  - PH-CF-400 (exe-scanner) の安定 identity 契約 (`entry_key` = 正規化済 絶対パス) と本 PH の `source_entry_key` を同 key 空間で揃える

## 参照

- `src-tauri/src/services/workspace_service.rs:87-110`
- `src-tauri/src/services/item_service.rs:151-155, 316-400, 422, 467, 473, 500` (auto_register / register_exe / delete_item)
- `src-tauri/src/services/item_service.rs:383-396, 476-489` (sys-ws-* tag 付与)
- `src-tauri/src/repositories/item_repository.rs:163` 付近 (`find_by_id` / `find_by_target`)
- `src-tauri/src/repositories/widget_item_hides_repository.rs:11-24` (`add` / `remove`)
- `src-tauri/migrations/029_widget_item_hides.sql`
- `src/lib/widgets/projects/ProjectsWidget.svelte:223` / `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:186` (自動登録の呼び出し元)
- `src/lib/state/workspace-config.svelte.ts:87-109`
- `src/lib/state/error-monitor.svelte.ts:53-67`
- `src/lib/components/arcagate/workspace/ItemWidget.svelte:84-86, 116-148`
