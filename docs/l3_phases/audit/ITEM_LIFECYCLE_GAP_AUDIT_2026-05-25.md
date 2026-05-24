---
id: item-lifecycle-gap-audit-2026-05-25
status: complete
type: 監査レポート
era: Distribution Hardening
---

# Library Item ライフサイクル gap 監査 (2026-05-25)

## 概要

`docs/l2_foundation/features/cross-cutting/item-lifecycle.md` で確定した「正しい挙動」 (確定原則 1〜5) と main HEAD `a0965ec` 時点の実コードの **gap** を網羅した監査レポート。 本 doc は contract doc の根拠データであり、 実装着手前に「どこを直すか」 を決める参考。

## 検証方法

1. **Claude 検証エージェント 3 体** (生成パス / 削除カスケード / reconcile を分担、 file:line で実コード照合)
2. **Codex 独立列挙** (`codex exec --sandbox read-only`、 high reasoning effort、 生出力 `CODEX_ITEM_LIFECYCLE_2026-05-25.md` 参照)
3. **grep audit**: `INSERT INTO items` / `DELETE FROM items` / `item_repository::insert` / `item_repository::delete` / `cascade_remove_item_from_widgets` / `find_source_back_link` の全 hit を `#[cfg(test)]` 経路と production 経路で区別

Claude と Codex の列挙はほぼ完全一致 (Codex は backend 中心、 Claude は frontend / fs event 経路まで深堀り)。

## 集約: 全 `INSERT INTO items` 経路 (production)

| # | SQL 発火地点                                                     | 経路区分                    |
| - | ---------------------------------------------------------------- | --------------------------- |
| 1 | `item_repository.rs:8-28` (`fn insert`)                          | 通常の創出経路 (C1〜C8)     |
| 2 | `export_service.rs:91-114` `INSERT OR REPLACE INTO items` 生 SQL | settings → JSON import (C9) |

production code 内の他 hit はすべて `#[cfg(test)]` (`tag_repository.rs:280` / `workspace_service.rs:438+` / `metadata_service.rs:374+` / `launch_repository.rs:169+` / `launch_service.rs:248` / `workspace_repository.rs:722+` / `db/migrations.rs:252,260`)。

`item_repository::insert` を呼ぶ production caller は `item_service.rs:66 / :457 / :574` の 3 箇所のみ (= C1, C6, C7)。

## 集約: 全 `DELETE FROM items` 経路 (production)

| # | SQL 発火地点                                            | 経路区分 |
| - | ------------------------------------------------------- | -------- |
| 1 | `item_repository.rs:182` (`fn delete`)                  | D1 / D8  |
| 2 | `item_service.rs:332` (`bulk_delete_items` raw SQL)     | D2       |
| 3 | `workspace_service.rs:113` (`delete_workspace` raw SQL) | D3       |
| 4 | `reset_service.rs:26` (factory reset raw SQL)           | D6       |

## バグ判定詳細 (実装着手で直す必要のあるもの)

### Bug 1: D2 bulk_delete_items の cascade 漏れ + hide 漏れ

**症状**:

- 監視自動登録 item を bulk 削除すると、 次の scan で復活 (モグラ叩き再発、 PH-CF-100 が D1 でのみ直した)
- LibraryItemPicker で widget config に追加した item を bulk 削除すると、 widget config JSON に存在しない id (dangling) が残る

**file:line**:

- 現状: `item_service.rs:317-338 bulk_delete_items`、 各 id について `DELETE FROM items WHERE id = ?1` (raw SQL、 `:332`) のみ
- 漏れ: `cascade_remove_item_from_widgets` (`workspace_repository.rs:236-252`) と `find_source_back_link` (`item_repository.rs:265-284`) の呼び出しが無い

**確定原則違反**: 4 (復活抑制) + 5 (孤立 / ghost 不在)

**修正方針**: D1 と同じ後始末 (hide 記録 + widget config strip + tx) を bulk loop 内の各 id にも適用。 共通 helper `delete_item_with_cleanup` (L2 contract §横展開先 audit) で集約。

### Bug 2: D3 workspace 削除の hide 漏れ + 手動 item を消す可能性

**症状**:

- workspace 削除 (`delete_items=true`) で監視由来 item を消した場合、 当該 widget が他 workspace に存在すれば再 scan で復活
- workspace 削除で **手動追加 item** が「他参照なし」 と判定されて消される (確定原則 3 違反)

**file:line**:

- 現状: `workspace_service.rs:99-126 delete_workspace`、 `collect_workspace_referenced_item_ids` で 2 経路和集合 → `is_item_referenced_outside_workspace` → `cascade_remove_item_from_widgets` + `DELETE FROM items`
- 漏れ 1: `find_source_back_link` 呼び出し無し → 監視 item の hide 記録なし
- 漏れ 2: 「手動 item か監視 item か」 の区別なし。 手動 item が当該 workspace の widget config item_ids に含まれていれば「workspace 参照」 とみなして削除対象に入れる

**確定原則違反**: 1 (手動 item 自動 cascade 不削除) + 3 (workspace 削除で手動 item 不変) + 4 (復活抑制)

**修正方針**:

- `delete_workspace(delete_items=true)` のロジックを「**監視由来 item (source_widget_id IS NOT NULL かつ当該 workspace の widget) のみ** 削除候補」 に絞る
- 手動 item (source_widget_id IS NULL) は widget config item_ids から strip するだけで item 自体は削除しない
- 削除候補について `find_source_back_link` → hide 記録

### Bug 3: D6 factory_reset(library=true, workspace=false) の cascade 漏れ

**症状**: workspace_widgets が残り、 config JSON の item_ids が全件 dangling

**file:line**:

- 現状: `reset_service.rs:15-47 factory_reset`、 `reset_library=true` で items を DELETE する前に `cascade_remove_item_from_widgets` を呼ばない (`:26`)
- `reset_workspace=false` の場合に dangling 残留

**確定原則違反**: 5 (孤立 / ghost 不在)

**修正方針**: items 削除前に全 widget config を走査して item_ids 全件 strip。 または「library のみ reset」 を許可しない (両 reset 必須化)。

### Bug 4: D7 widget 削除で監視 item を消さない (確定原則 2 違反)

**症状**: 監視ウィジェットを削除しても、 そのウィジェットが scan で自動登録した item は Library に残る (現状は `source_widget_id` を SET NULL で降格)。 user の意図通りなら良いが、 確定原則 2 は「自動 item は所有 widget 削除で削除」。

**file:line**:

- 現状: `workspace_service.rs:180-185 remove_widget` → `workspace_repository.rs:155-161 DELETE FROM workspace_widgets WHERE id = ?1` のみ
- FK 連動: migration `039_items_source_back_link.sql:22` で `items.source_widget_id REFERENCES workspace_widgets(id) ON DELETE SET NULL` → 自動 item が user-owned に降格

**確定原則違反**: 2 (監視 item は所有 widget 削除で削除)

**修正方針** (要 user 確認: §未確定パターン U-1):

- 案 (a): `ON DELETE SET NULL` を撤回し、 widget 削除前に `find_owned_items(widget_id)` → 「他参照なし」 のものを `delete_item_with_cleanup` 経由で削除
- 案 (b): 現状の「降格」 を確定原則として doc 化 (確定原則 2 を「ただし他参照なくても降格して残す」 に書き換え) — UX 観点で「scan の手間を失わない」

### Bug 5: D8 watched_path 削除のトランザクション欠落 + hide 漏れ

**症状**:

- 中途失敗で inconsistent 残留 (例: cascade_remove の途中で panic → items は削除済だが watched_paths は残る)
- 監視自動登録 item を消しても hide 記録なし → 同 path を再 watch すると復活

**file:line**:

- 現状: `watched_path_service.rs:58-88 remove_watched_path`、 **`conn.transaction()` 不使用** (個別 `conn.execute` 連鎖)
- `find_tracked_ids_under_path` (`item_repository.rs:288-303`) で tracked id 集合 → 各 id について `cascade_remove_item_from_widgets` + `item_repository::delete`、 `widget_item_hides::add` 呼び出し無し

**確定原則違反**: 4 (復活抑制) + 5 (整合性)

**修正方針**: `conn.transaction()` で囲い、 各 id について `delete_item_with_cleanup` (= hide + cascade + delete) を呼ぶ helper を経由。

### Bug 6: D10 / D11 / D12 — 監視設定変更で旧 entry 由来 item が孤立

**症状**: `watched_folder` / `watch_path` / `extensions` / `scan_depth` を変更すると、 旧設定で登録された item が孤立 (新 scan に出ない → reconcile されない)。 さらに `find_by_source` が hit すると旧 item の target / label を新 entry の代わりに使い続ける。

**file:line**:

- 現状: `ProjectsWidget.svelte:211-242` / `ExeFolderWatchWidget.svelte:152-250` の `$effect` で `prevFolder!==folder` 等を検知 → `folderItems = []` で widget 表示 reset + 新 path で再 scan + auto-register
- 漏れ: 旧 entry に対応する `source_widget_id == 当 widget` の item を検出して削除する経路無し
- 加えて: `register_exe_item_on_conn:519-521` で既存 item が hit すると新 entry の target / label を上書きせず旧値を維持

**確定原則違反**: 5 (孤立)

**修正方針** (要 user 確認: §未確定パターン U-8):

- backend 側 `auto_register_*` 系のシグネチャを「全 scan 結果リスト」 を受け取る形に変更し、 「`source_widget_id == widget_id` AND `source_entry_key NOT IN (new_scan_entry_keys)`」 を `delete_item_with_cleanup` で消す reconcile を 1 トランザクション内に追加
- 同時に既存 item hit 時の target / label 更新 (`update_target_by_source`) 経路も追加

### Bug 7: D14 ファイル rename で `source_entry_key` が更新されない

**症状**: folder rename (exe-folder の 1st-level フォルダ rename) で `source_entry_key` が古いまま → 次の scan で新 folder の entry_key が一致せず新規 item 作成、 旧 item は孤立 + `widget_item_hides` の entry_key 空間ズレ

**file:line**:

- 現状: `watcher/mod.rs:89-100` → `watcher_service.rs:29-36` → `item_repository.rs:189-202 update_target_by_path` (`UPDATE items SET target = ?1 WHERE target = ?2`)
- 漏れ: `source_entry_key` 更新なし。 `widget_item_hides.item_target` (= entry_key) も追従しない

**確定原則違反**: 5 (整合性)

**修正方針**: rename イベントで (a) `items.target` 更新、 (b) `items.source_entry_key` 更新 (target → entry_key の writer は監視 widget 種別ごとに異なる: projects は target = entry_key、 exe-folder は target = exe path / entry_key = parent folder)、 (c) `widget_item_hides.item_target` も同期更新。

### Bug 8: C9 JSON import で back-link 列喪失

**症状**: 監視自動登録 item を export → import すると user-owned に降格 (`source_widget_id` / `source_entry_key` が NULL になる)

**file:line**:

- 現状: `export_service.rs:91-114 INSERT OR REPLACE INTO items` の column list に `source_widget_id` / `source_entry_key` / `card_override_json` が含まれていない
- export 側 (`export_service.rs:???`) でも同列を出していない疑い (要確認)

**確定原則違反**: 1, 2 (所有モデル破綻)

**修正方針**: export / import の column list を items table の全列に揃える。 export 時にも `source_widget_id` / `source_entry_key` / `card_override_json` を出力。 import 時に存在しない `source_widget_id` (= source widget が import 先 DB に無い) は SET NULL でフォールバック。

### Bug 9: C5 Undo で back-link 列喪失

**症状**: Bug 8 と同型 — 監視自動登録 item を D1 で削除 → 5 秒以内 Undo すると user-owned に降格

**file:line**:

- 現状: `library-history.svelte.ts:82-92 undo()` → `createItem(input)` (`items.svelte.ts:56`) → `cmd_create_item` の `CreateItemInput` 型に source 列が無い

**確定原則違反**: 1, 2 (所有モデル破綻)

**修正方針** (要 user 確認: §未確定パターン U-6): `CreateItemInput` に source 列を追加し、 Undo snapshot を完全復元。 widget が削除されていれば SET NULL でフォールバック (FK 制約のため)。

### Bug 10: C8 `cmd_register_exe_item` (single) は死路

**症状**: 公開 IPC `cmd_register_exe_item` は frontend からの caller 0 件 (PH-CF-500 で bulk 経路に一本化済)

**file:line**:

- IPC: `item_commands.rs:215-224 cmd_register_exe_item` → `item_service.rs:486-496 register_exe_item`
- 使用箇所: `Grep "registerExeItem("` で 0 hit (production 経路)

**確定原則違反**: なし (完全性 sweep 観点の冗長性)

**修正方針**: 削除推奨 (PH-PQ-500 同型 sweep 対象)。

## ⚠️ 設計仕様の整合性確認 (バグでないが要確認)

### Issue A: D5 タブ / workspace 削除の semantics

現状の UI 上「タブ」 = `workspaces` row 切替であり、 タブ単位削除という別経路は **存在しない** (grep で `workspace_tab` / `delete_tab` 0 hit)。

確定原則 3 は「ワークスペースのページ / タブ削除 → 手動追加アイテムは消さない」 と書かれているが、 これは現状の「タブ削除 = workspace 削除」 と同義であることを doc で明示する必要がある。

§未確定パターン U-9 で確定: (a) doc 文言を「workspace 削除では手動 item を消さない」 に統一 / (b) 内部 page 概念を新設して別経路にする。 (a) 推奨。

### Issue B: D9 / D13 — ターゲット実体消失時の挙動

D9 (再 scan で消えた監視 item) と D13 (fs Remove イベントで toast のみ) は確定原則で未定義。 §未確定パターン U-2 / U-3 で「自動削除」 vs 「`is_enabled=false` 化」 vs 「現状 (何もしない / toast のみ)」 を user に確定させる必要あり。

実装側の整合性として、 `is_enabled=false` を採用するなら:

- Library 表示で grey-out
- launch 試行で「対象ファイルが見つかりません」 toast + 「Library から削除」 / 「無視」 のアクション
- 再 scan で復活時に `is_enabled=true` に戻すか維持か (= U-2 / U-3 連動)

### Issue C: D15 fs Create イベントの dead path

`watcher/mod.rs:77-88` で `app.emit("folder://new-directory", path_str)` するが frontend listener なし。 PH-CF-500 D2 で `auto_add` 機構を意図的に撤廃済。 backend が無駄に emit している。

§未確定パターン U-4: (a) emit 撤廃 (backend 計算節約、 推奨) / (b) reconcile に活用。

### Issue D: D17 「アイテムを workspace から外す」 専用 operation 不在

現状の UI に「Library 残しで workspace 配置だけ外す」 専用 operation は **存在しない**。 widget 右クリック「この widget から外す」 (`WidgetItemContextMenu.svelte:104` `handleHideFromWidget`) は per-widget hide であって Library 残しの workspace 解除ではない。

§未確定パターン U-5: (a) 専用 `cmd_remove_item_from_workspace(workspace_id, item_id)` を新設 (sys-ws-* tag 解除 + widget config item_ids strip、 item 行は残す) / (b) 現状維持。 (a) 推奨。

## 「item は残るが参照が壊れる」 dangling パターン一覧

| 経路                            | 残る対象                        | 壊れる参照                            | 原因                                            |
| ------------------------------- | ------------------------------- | ------------------------------------- | ----------------------------------------------- |
| D2 bulk delete                  | (item 自体は消える)             | widget config item_ids に dangling id | `cascade_remove_item_from_widgets` 呼び出し無し |
| D6 factory reset (library only) | (item 自体は消える)             | widget config item_ids 全件 dangling  | 同上                                            |
| D8 watched_path delete          | (item 自体は消える)             | `widget_item_hides` の entry_key 残留 | hide には FK なし、 意図的だが意味なし          |
| D9 再 scan で元ファイル消失     | item DB 行                      | target ファイル不在                   | 検出経路なし                                    |
| D10 / D11 / D12 設定変更        | item DB 行                      | scan に出ない旧 entry_key             | reconcile 経路なし                              |
| D14 rename                      | item DB 行の `source_entry_key` | entry_key が古い folder name          | rename で target のみ更新                       |
| D13 fs Remove                   | item DB 行                      | target ファイル不在                   | toast のみで DB 不変                            |

## 横展開: 共通 helper の設計

L2 contract §横展開先 audit で提案した `delete_item_with_cleanup(tx, item_id)` 共通 helper の責務:

```rust
// item_service.rs に新設 (signature イメージ、 実装は plan 後)
fn delete_item_with_cleanup(
    tx: &Transaction,
    item_id: &str,
) -> Result<(), AppError> {
    // 1. 監視由来かチェック → hide 記録
    if let Some((widget_id, entry_key)) = item_repository::find_source_back_link(tx, item_id)? {
        widget_item_hides_repository::add(tx, &widget_id, &entry_key)?;
    }
    // 2. widget config の item_ids / item_id を strip
    workspace_repository::cascade_remove_item_from_widgets(tx, item_id)?;
    // 3. item 自体を削除 (item_tags / launch_log / item_stats / confirmed_items は FK CASCADE)
    item_repository::delete(tx, item_id)?;
    Ok(())
}
```

呼び出し元 (5 経路):

- D1 `delete_item`: 現状 inline の 3 step を helper 経由に置換
- D2 `bulk_delete_items`: ループ内で helper 呼び出し (Bug 1 修正)
- D3 `delete_workspace` で監視 item を消すケース: helper 経由 (Bug 2 修正)
- D6 `factory_reset` で reset_library かつ widgets 残すケース: items DELETE 前に loop で helper 呼び出し (Bug 3 修正)
- D7 `remove_widget` で監視 item を消すケース (U-1 確定後): widget 削除前に helper ループ
- D8 `remove_watched_path`: tracked id 集合に対して helper ループ + tx 化 (Bug 5 修正)

## 機械検出計画

実装着手後に追加すべき audit / test:

1. **audit script** `audit-item-cascade-helper.sh`: `DELETE FROM items` の caller が `delete_item_with_cleanup` を経由しているか grep (例外: helper 自身と migration cleanup)
2. **statefulset integrity audit query** (`scripts/audit-item-integrity.sh`): SQL で:
   - `items.source_widget_id` が指す widget が `workspace_widgets` に存在する (または NULL)
   - `widget_item_hides.widget_id` が `workspace_widgets` に存在する
   - 全 `workspace_widgets.config` JSON の `item_id` / `item_ids` 値が `items.id` に存在する
3. **Rust 統合 test**:
   - D2 bulk: 監視 item の bulk 削除で hide 記録される / widget config strip される
   - D3 workspace 削除: 手動 item は残る / 監視 item は hide 記録される
   - D6 factory_reset: library のみで widget config が clean
   - D7 widget 削除: U-1 確定後の正規挙動を verify
   - D8 watched_path 削除: hide 記録される / tx 化
   - D9 / D10 / D11 / D12: U-2 / U-8 確定後の reconcile 挙動
   - D14 rename: source_entry_key も更新される
   - C5 / C9: back-link 完全復元

## 数値サマリ

| 区分                       | 件数   | 内訳                                                                                                                                                                         |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 生成パターン               | **9**  | C1-C9 (manual 5 / auto 2 / dead 1 / import 1)                                                                                                                                |
| 削除 / 保持 / 孤立トリガー | **18** | D1-D18                                                                                                                                                                       |
| **合計パターン**           | **27** |                                                                                                                                                                              |
| バグ判定 (要修正)          | **10** | Bug 1 (D2) / Bug 2 (D3) / Bug 3 (D6) / Bug 4 (D7、 U-1 で確定) / Bug 5 (D8) / Bug 6 (D10/D11/D12 — 3 件 1 セット) / Bug 7 (D14) / Bug 8 (C9) / Bug 9 (C5) / Bug 10 (C8 死路) |
| 要確認 (未確定パターン)    | **9**  | U-1〜U-9                                                                                                                                                                     |
| 現状で正しく動作           | **8**  | C1-C4, C6-C7, D1, D16, D18                                                                                                                                                   |

## 参照

- L2 契約 doc (本 audit の正): [`docs/l2_foundation/features/cross-cutting/item-lifecycle.md`](../../l2_foundation/features/cross-cutting/item-lifecycle.md)
- Codex 独立列挙生出力: [`CODEX_ITEM_LIFECYCLE_2026-05-25.md`](./CODEX_ITEM_LIFECYCLE_2026-05-25.md)
- 関連 plan: `docs/l3_phases/clean-feedback/PH-CF-100_workspace-library-integrity.md` (逆方向 LC data model) / `PH-CF-500_watch-widget-chrome.md` (復元 UI)
- 主要 file: `src-tauri/src/services/item_service.rs` / `workspace_service.rs` / `watched_path_service.rs` / `reset_service.rs` / `watcher_service.rs` / `watcher/mod.rs` / `repositories/item_repository.rs` / `widget_item_hides_repository.rs`
- migration: `001_initial.sql` (FK CASCADE) / `029_widget_item_hides.sql` / `033_confirmed_items.sql` / `039_items_source_back_link.sql`
  </content>
