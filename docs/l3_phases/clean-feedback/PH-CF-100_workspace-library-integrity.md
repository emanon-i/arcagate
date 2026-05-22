---
id: PH-CF-100
status: planning
batch: clean-feedback
type: バグ修正
era: Distribution Hardening
parent: README.md
---

# PH-CF-100: workspace ↔ Library 参照整合

## 元 user fb (検収項目)

- **E4**: ワークスペースのタブを消すと必ず右下にエラーが出る → 直す
- **E5**: workspace 削除後も Library アイテムが孤立して残り、 後で設定変更すると `ItemNotFound` エラーになる

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

## スコープ

- workspace 削除 / タブ削除の cascade を **参照経路 2 系統の両方** を見るよう再設計
- 孤立 item を生まない / 残さない
- タブ削除後の unhandled rejection を握り、 `toast.unexpected_error` が出ないようにする

## やらないこと

- E6 (タブ削除確認モーダルに「アイテムも消す」 チェックボックス) — UI は PH-CF-300。 本 PH は backend の cascade 基盤と「アイテムを消すか残すか」 を選択可能にする `delete_items: bool` 引数の追加までを担う
- workspace D&D 配置 (E1) — PH-CF-200

## 具体タスク

1. **reject 特定**: agent dev で workspace にタブを作り widget を載せて削除、 CDP console の `[error-monitor]` ログから reject 元の呼び出しを file:line で特定。 doc に追記
2. **参照集合の一本化**: 「workspace 配下の item 参照集合」 を 1 クエリで返す関数を `workspace_repository.rs` に新設 — `sys-ws-<id>` tag の item ∪ 当該 workspace の全 widget config JSON の `item_ids`。 widget config は JSON なので、 Rust 側で workspace の widget 一覧 → config パース → `item_ids` 収集
3. **cascade の再設計**: `workspace_service.rs:87-110` `delete_workspace` を、 上記参照集合のうち「他 workspace から参照されない item」 のみ削除するよう書き換え。 `delete_items: bool` 引数を追加 (PH-CF-300 / E6 が使う、 default = false = item を残す)
4. **`cmd_delete_workspace` シグネチャ拡張**: `workspace_commands.rs` に `delete_items: bool` を追加。 既存呼び出しは `false` 固定
5. **reject 元の握り**: タスク 1 で特定した呼び出しに `try/catch` (または cancel エラーの判別と無視) を入れ、 unhandled rejection を解消。 cancel reject なら「cancel は正常系」 として toast を出さない
6. **孤立検出 audit query**: 「どの workspace tag も持たず、 どの widget config からも参照されない宙ぶらりん item」 / 「widget config が指す存在しない item id」 を検出する SQL を作り、 reset_service か専用 audit に組み込む

## 受け入れ条件 (機械検出)

- [ ] Rust unit test: workspace に (a) `workspace_id` 付き create した item, (b) `LibraryItemPicker` 相当で widget config に id 追加した既存 item の両方を載せ、 workspace 削除後に **孤立 item が 0 / dangling な widget config 参照が 0** であること
- [ ] Rust unit test: `delete_items = false` で workspace 削除 → item は Library に残る / `delete_items = true` → 他 workspace 非参照の item は消える
- [ ] e2e: タブを作成 → widget 配置 → タブ削除、 `toast.unexpected_error` トーストが **出ない** こと
- [ ] 孤立検出 audit query が既存 DB に対して 0 violations

## 機能契約の追記

`features/backend/workspace-service.md`:

> **workspace 削除の cascade 契約**: workspace 配下の item 参照は `sys-ws-<id>` tag と widget config JSON `item_ids` の 2 経路がある。 cascade はこの **和集合** を対象集合とし、 「他 workspace から参照されない item」 のみ削除する。 削除有無は `delete_items` で制御し default は item 保持。 cascade 後に孤立 item / dangling 参照を残してはならない。

`features/backend/item-service.md`:

> **item 参照整合契約**: item を削除する全経路の後、 その item を指す widget config `item_ids` は同一トランザクション内で除去するか、 参照側が missing id を graceful に skip する。 `find_by_id` の `NotFound` を UI 操作経路で握りつぶさず toast 化してよいのは「ユーザーが今まさに開いた item が消えていた」 例外時のみ。

機械検出: 上記 audit query を `scripts/audit-*.sh` 相当に追加し CI で実行。

## 横展開

- `image_scrap` widget の D&D 追加 item も tag を付けないため E5 と同型 — 参照集合一本化で同時に解消されることを確認
- `bulkAddItemWidgets` 経路 (`workspace-widgets.svelte.ts`) も既存 item を載せる経路。 同じく tag 非付与かを確認
- 他に `find_by_id` の `NotFound` が UI で toast 化される経路がないか grep

## 工数感

| Task                                       | 工数     |
| ------------------------------------------ | -------- |
| reject 特定 (agent dev + CDP)              | 0.5 日   |
| 参照集合一本化 + cascade 再設計 + IPC 拡張 | 2-3 日   |
| reject 握り + audit query                  | 1 日     |
| unit / e2e test                            | 1-1.5 日 |

合計: 約 1 週間。

## 依存・着手順

- **先行**: なし。 本 batch の先頭
- **後続**: PH-CF-300 (E6) が本 PH の `delete_items` 引数を前提にする

## 参照

- `src-tauri/src/services/workspace_service.rs:87-110`
- `src-tauri/src/services/item_service.rs:383-396, 476-489`
- `src-tauri/src/repositories/item_repository.rs:163` 付近
- `src/lib/state/workspace-config.svelte.ts:87-109`
- `src/lib/state/error-monitor.svelte.ts:53-67`
- `src/lib/components/arcagate/workspace/ItemWidget.svelte:84-86, 116-148`
  </content>
