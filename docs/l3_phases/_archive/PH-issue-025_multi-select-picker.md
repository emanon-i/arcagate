---
id: PH-issue-025
title: ItemPicker 複数選択 + 一括 ItemWidget 配置 — collection 型 default 化 (Issue 8)
status: planning
parent_l1: REQ-006_workspace-widgets
related: PH-issue-005 (LibraryItemPicker = LibraryCard 再利用)、PH-issue-024 (Opener registry)、PR #233 cascade
---

# Issue 8: collection 型 default 化 audit + ItemPicker 複数選択

## 元 user fb (検収項目 #8 = collection 型 default)

> 現状 widget が「1 item per widget」前提か「多 item collection」前提か audit。
> ItemWidget が複数 item 持てるか / Picker で複数選択 → 全配置できるか確認。
> 不完全なら collection 型を default に。

## 引用元 guideline doc

| Doc                                    | Section                            | 採用判断への寄与                                               |
| -------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `docs/desktop_ui_ux_agent_rules.md`    | P3 主要 vs 補助 / P10 熟練者効率   | 1 つずつ追加 N 回より 1 picker で N 個 batch を 1 アクション化 |
| `docs/l1_requirements/ux_standards.md` | §6-3 Dialog (multi-select pattern) | チェックボックス + 「追加 (N)」ボタン                          |
| `docs/l1_requirements/vision.md`       | M1 launch 摩擦ゼロ                 | 5 アイテム配置を 5 操作 → 1 操作に                             |
| `CLAUDE.md`                            | 「毎日使えるか?」                  | 配置摩擦の解消                                                 |

## Audit 結果 (現状の widget 内訳)

| Widget                            | item 数 | 性質                                      |
| --------------------------------- | ------- | ----------------------------------------- |
| **ItemWidget**                    | **1**   | pinned shortcut (大アイコン + label 中央) |
| FavoritesWidget                   | 多      | sys-starred タグで自動収集                |
| RecentLaunchesWidget              | 多      | launch_log から自動                       |
| ProjectsWidget                    | 多      | folder 型 + watched_path から自動         |
| StatsWidget                       | 多      | item_stats top N 自動                     |
| ExeFolderWatchWidget              | 多      | watched_folder 配下の exe 自動スキャン    |
| WatchFolder (= ProjectsWidget)    | 多      | 同上                                      |
| FileSearchWidget                  | 多      | 検索結果                                  |
| DailyTaskWidget                   | 多      | tasks                                     |
| ClipboardHistoryWidget            | 多      | クリップボード履歴                        |
| SnippetWidget                     | 多      | snippets                                  |
| QuickNoteWidget                   | 1       | singleton (1 note)                        |
| ClockWidget / SystemMonitorWidget | 0       | 表示専用                                  |

→ **ItemWidget のみ「1 item per widget」**、他は collection 既定。

### 不完全な点

- ItemWidget 経路: 1 widget = 1 アイテム = Picker 単一選択 → 5 アイテム配置 = 5 widget × 5 click = **10 操作**
- LibraryItemPicker は単一選択のみ (PH-issue-005 で「複数選択は別 plan」と明記、本 plan で実装)
- D&D Library → Workspace は未実装 (out-of-scope)

### 解 (採用案 A)

**Picker 複数選択 + 1 アクションで N 個 ItemWidget 一括配置**:

1. LibraryItemPicker に `multi: boolean` prop (default false) 追加
2. multi=true の時:
   - 各 LibraryCard に checkbox overlay (左上)
   - 下部に sticky bar 「追加 (N)」 button + 「キャンセル」
   - clicking card = toggle checkbox (ondblclick で「即追加」も可、ただし multi 中は無効)
3. ItemWidget の「アイテムを紐付け」empty state を multi=true に変更
4. select 時に N 個 callback:
   - 1 個目: 現 widget の `item_id` に set
   - 2..N 個目: `workspaceStore.bulkAddItemWidgets(restIds)` で連続追加

### 棄却案 B: 「ItemWidget を multi-item collection に変更」

- ItemWidget の視覚 (大アイコン + label 中央) は singleton 専用デザイン
- multi 化すると FavoritesWidget と被る (= 名前 / 役割重複、P4 一貫性違反)
- → 棄却

### 棄却案 C: 「D&D Library → Workspace」

- LibraryMainArea から Workspace canvas への drag は新規大改修
- 別 issue とする
- → 本 plan ではスコープ外、棄却

## 横展開 phase

| 領域                                                            | 影響                                                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `LibraryItemPicker`                                             | multi prop + checkbox UI + 下部 confirm bar                                                                                 |
| `ItemWidget`                                                    | empty state Picker 呼び出しを multi=true に                                                                                 |
| `workspaceStore`                                                | `bulkAddItemWidgets(itemIds: string[])` 新規。各 item に対し addWidget('item') + updateWidgetConfig({ item_id }) を直列実行 |
| 既存 `ItemWidget` ピン変更 (`menuItems` から「アイテムを変更」) | **single 維持** (1 個変更を多選択にすると意図不明)                                                                          |
| その他 widget の Picker 呼び出し                                | 該当なし                                                                                                                    |

## 実装ステップ

1. `LibraryItemPicker.svelte` に `multi: boolean` + `onSelectMany?: (items: Item[]) => void` prop 追加
2. multi=true 時の checkbox UI + 下部 confirm bar
3. `workspaceStore.bulkAddItemWidgets` 実装
4. `ItemWidget.svelte` の empty state でのみ multi=true 採用、「アイテムを変更」menu は single 維持
5. E2E spec 1 件追加: `tests/e2e/multi-item-picker.spec.ts`
   - 3 items 作成 → ItemWidget 追加 → Picker 開く → 3 個 check → 「追加 (3)」 → 3 ItemWidget 配置確認

## 受け入れ条件

- [ ] LibraryItemPicker single mode (既存 ItemWidget「アイテムを変更」) で挙動変化なし
- [ ] LibraryItemPicker multi mode で checkbox + 「追加 (N)」が表示される
- [ ] Picker で 3 個選んで「追加 (3)」 → 1 widget の item_id 更新 + 2 widget 新規配置
- [ ] 配置 widget は overlap せず連続配置 (findFreePosition 経由)
- [ ] N=0 の時「追加」 button 無効化
- [ ] cargo + svelte-check + biome + dprint 通過
- [ ] E2E 1 件追加 + pass
