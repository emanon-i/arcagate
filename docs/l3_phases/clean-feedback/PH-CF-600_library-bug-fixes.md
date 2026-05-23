---
id: PH-CF-600
status: implemented
batch: clean-feedback
type: バグ修正
era: Distribution Hardening
parent: README.md
---

# PH-CF-600: ライブラリ画面 バグ修正

## 元 user fb (検収項目)

- **C2**: 見た目設定で画像変更後、 画面を切り替えるまでカードに反映されない → 即時反映
- **C3**: 「Launch this week」 がカウントされていない疑い → 機能しているか調査
- **C4**: 「非表示を表示」 ON 時、 隠しアイテムが All タブでしか出ない → Type 絞り込み中も出す (グレーアウト可)
- **C7**: 右サイドパネルが検索バー / 並び替えボタンのクリックで閉じる → 閉じるのは余白クリックのみに

## 引用元 guideline doc

| Doc                                                   | Section                                 | 採用判断への寄与                  |
| ----------------------------------------------------- | --------------------------------------- | --------------------------------- |
| `docs/l2_foundation/features/screens/library.md`      | フィルタ / panel                        | hidden 表示・panel 閉じ条件の契約 |
| `docs/l2_foundation/features/backend/item-service.md` | 統計                                    | Launch this week 集計             |
| `CLAUDE.md`                                           | `<critical-rule id="instant-feedback">` | C2 即時反映                       |
| `CLAUDE.md`                                           | `<critical-rule id="lateral-sweep">`    | C7 panel 閉じ条件の横展開         |

## Fact 確認 (root cause)

### C2: 画像変更が即時反映されない

`ItemFormCardOverride.svelte:103-106` `selectImage()` は `cmd_save_icon_file` (毎回新 UUID パスを返す) → `itemStore.updateItem({ icon_path })`。 `updateItem` (`items.svelte.ts:57-72`) は `items` 配列を再代入しリアクティブ。 `LibraryView.svelte:173/226` の `{#key}` も `icon_path` を含む。 **ストア更新経路は正しい**。

残る最有力候補は `LibraryCard.svelte:192-195` の **`content-visibility: auto`**。 `{#key}` 再マウントで生成された新カード要素が、 モーダルオーバーレイに遮蔽されている間は描画スキップされ、 モーダルを閉じる / 画面遷移で再描画される。 detail metadata / card override 内プレビューは `content-visibility` を持たないため即時更新 → user には「グリッドのカードだけ古い」 と見える。 **実装着手時に agent dev + CDP でこの仮説を実機確認すること**。

### C3: Launch this week がカウントされない (実バグ・断定)

`item_repository.rs:188` の集計クエリ:

```sql
(SELECT COUNT(*) FROM launch_log WHERE launched_at >= datetime('now', '-7 days'))
```

`launch_log.launched_at` は `launch_repository.rs:16-19` で `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')` 形式 (**`T` 区切り + `Z` 付き**、 例 `2026-05-23T10:30:00Z`)。 一方 `datetime('now', '-7 days')` は SQLite 標準形式 (**スペース区切り・`Z` 無し**、 例 `2026-05-16 10:30:00`)。 両者はフォーマット不一致の文字列比較になり、 位置 10 の `T`(0x54) vs スペース(0x20) で全 ISO タイムスタンプが常に大きく評価される → **7 日境界が機能せず実質「全期間カウント」** になる (ゼロでなく過大カウント)。 既存テスト `test_get_library_stats_with_data` (`:559`) は launch 記録なしのため未検出。

### C4: hidden item が Type タブで出ない (断定)

`LibraryMainArea.svelte:204-223` `filteredItems` の hidden フィルタ自体は正しく `libraryShowHidden` を見ている。 問題は `rawSource` — Type タブ選択時は `localTagItems` (`searchItemsInTag` IPC 結果) を使う。 `searchItemsInTag` の Rust クエリ (`item_repository.rs:71-75`) に `AND i.is_enabled = 1` がハードコードされており、 **hidden item が Rust 側で除外されてフロントに届かない**。 All タブ (`activeTag === null`) は `itemStore.items` (`listItems` = 全件) を使うため hidden が出る。 グレーアウト表示は `LibraryCard.svelte:89/122` の `is_enabled` 分岐で実装済 — hidden がフロントに届きさえすれば自動でグレー表示される。

### C7: 右サイドパネルが検索バー / 並び替えで閉じる (断定)

`LibraryMainArea.svelte:369-373`:

```ts
onclick={(e) => {
  if (!(e.target as HTMLElement).closest('[data-testid^="library-card-"]')) {
    onSelectItem?.(null);   // detail panel を閉じる
  }
}}
```

この `onclick` は `<div class="min-h-full p-5">` (`:366`) に付き、 その子に検索バー (`:380`) と並び替えコントロール (`:381-387`) も含まれる。 クリック対象がカード (`library-card-*`) でなければ無条件で panel を閉じる → 検索 input・sort select・view ボタンは「カードでない」 ため全て閉じトリガー。 ホワイトリスト方式 (`closest('[data-testid^="library-card-"]')`) が対象集合が広すぎる構造欠陥。

## スコープ

ライブラリ画面のバグ 4 件 (C2 / C3 / C4 / C7) を修正。

## やらないこと

- ライブラリ画面の UX 変更 (C5 / C6) と背景 (C8) — PH-CF-700
- カード見た目設定 modal の機能拡張 — 本 PH は C2 の即時反映バグのみ

## 具体タスク

1. **C2**: agent dev + CDP で `content-visibility` 仮説を実機確認。 確認できたら、 画像変更後に対象カードの再描画を明示トリガー (`content-visibility` を一時無効化、 または `convertFileSrc` 結果を `$state` で強制再評価)。 併せて `itemStore.applyOptimisticUpdate` を `cmd_save_icon_file` の await 前に呼び、 同一フレームで store 更新
2. **C3**: `item_repository.rs:188` のクエリを `strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-7 days')` に揃える (保存フォーマットと一致)。 または両辺を `datetime(launched_at)` で正規化。 7 日内 / 7 日超の launch を含むテストケースを追加
3. **C4**: `searchItemsInTag` の Rust クエリ (`item_repository.rs:71-75`) に **`include_disabled: bool` 引数を追加** する。 `AND i.is_enabled = 1` の単純撤去は **禁止** — Codex クロスチェックで `searchItemsInTag` が favorites widget (`FavoritesWidget.svelte:34` `searchItemsInTag('sys-starred', '')`) からも呼ばれていることが判明したため、 撤去すると favorites に hidden item が漏れる。 flag は default `false` (= 従来挙動)、 Library 画面のみ `libraryShowHidden` 連動で `true` を渡す。 着手時に `searchItemsInTag` の全 call-site (Library / favorites / その他) を列挙し、 各 call-site が `include_disabled` をどう渡すべきか matrix で確定してから実装
4. **C7**: panel の閉じ条件を「余白クリックのみ」 へ。 閉じトリガー要素を `e.target === e.currentTarget` 判定か専用マーク (`data-library-blank`) に限定し、 検索バー / sort / グリッドコンテナ等のインタラクティブ領域を除外。 ホワイトリスト方式を撤廃

## 受け入れ条件 (機械検出)

- [ ] C2: e2e — カード見た目設定で画像変更 → モーダルを閉じた直後 (画面遷移なし) にグリッドのカード画像が更新されている
- [ ] C3: Rust unit test — 7 日以内 N 件 + 7 日超 M 件の launch_log fixture で `recent_launch_count == N`
- [ ] C4: Rust unit test — hidden (`is_enabled=0`) item を tag 付与 → `searchItemsInTag(include_disabled=true)` の結果に hidden item が含まれ、 `include_disabled=false` では含まれない
- [ ] C4: call-site matrix が doc 化され、 favorites widget 等の既存 call-site が `include_disabled=false` (従来挙動) を保つことを確認
- [ ] C4: e2e — 「非表示を表示」 ON + Type タブ選択 → hidden item がグレーアウトで表示される / favorites widget には hidden item が漏れない
- [ ] C7: e2e — detail panel を開いた状態で検索バー / sort ボタンをクリック → panel が閉じない / 余白クリック → 閉じる

## 機能契約の追記

`features/backend/item-service.md`:

> **launch 集計契約**: launch_log の期間集計は `launched_at` の保存フォーマット (`%Y-%m-%dT%H:%M:%SZ`) と比較対象を一致させる。 SQLite の `datetime()` 既定フォーマットと混在させない。 期間境界をまたぐ fixture でテストする。

`features/screens/library.md`:

> **hidden 表示契約**: 「非表示を表示」 ON 時、 hidden item は All タブだけでなく Type タブ・tag タブでも表示する (グレーアウト可)。 hidden を返すかは backend クエリの `include_disabled` 引数で明示制御し、 呼び出し側が画面の意図に応じて渡す。 `is_enabled` をクエリにハードコード固定除外しない。 共有クエリ (`searchItemsInTag` 等) の挙動を変えるときは全 call-site を matrix で確認する。
>
> **detail panel 閉じ条件契約**: detail panel が閉じるのは余白クリックのみ。 検索バー・sort・グリッド内のインタラクティブ要素のクリックでは閉じない。 「カードでなければ閉じる」 のホワイトリスト方式を使わない。

機械検出: C3 / C4 の unit test、 C7 の e2e を回帰テストとして常設。

## 横展開

- **C3 launch_log フォーマット**: 期間境界比較を使う他の箇所 (`palette.svelte.ts` の frecency、 `reset_service.rs`、 `workspace_repository.rs`) で `launched_at` の `datetime()` 比較がないか grep
- **C7 panel 閉じ条件**: 同型の click-outside 実装を audit。 `ContextMenu.svelte:36-40` の `contains()` 方式が正規パターン。 Library detail panel のホワイトリスト方式が唯一の不正パターンであることを確認し、 doc 化
- **C4 共有クエリの call-site matrix**: `searchItemsInTag` は Library 画面と favorites widget (`FavoritesWidget.svelte:34`) が共有。 `include_disabled` 追加時は両 call-site を必ず確認 (favorites = `false` 維持)。 加えて `is_enabled = 1` をハードコードする他クエリ (`search` `:57` / `get_library_stats` `:186` 等) も UI のフィルタ意図と矛盾しないか確認

## 工数感

| Task                        | 工数   |
| --------------------------- | ------ |
| C2 (実機確認 + 再描画 fix)  | 1.5 日 |
| C3 (クエリ修正 + test)      | 0.5 日 |
| C4 (Rust クエリ + フロント) | 1 日   |
| C7 (閉じ条件再設計)         | 1 日   |
| test 全般                   | 1 日   |

合計: 約 1 週間。

## 依存・着手順

- **先行**: なし
- **後続**: なし

## 参照

- `src/lib/components/item/ItemFormCardOverride.svelte:103-106`
- `src/lib/components/arcagate/library/LibraryCard.svelte:89, 122, 192-195`
- `src/lib/components/arcagate/library/LibraryMainArea.svelte:204-223, 366-387`
- `src-tauri/src/repositories/item_repository.rs:57, 71-75, 186, 188`
- `src-tauri/src/repositories/launch_repository.rs:16-19`
- `src/lib/components/common/ContextMenu.svelte:36-40` (正規 click-outside パターン)
