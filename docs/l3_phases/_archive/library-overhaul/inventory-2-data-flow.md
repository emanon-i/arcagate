# §2 inventory: data flow / cross-screen integration

## 2.1 Library 内 data flow

### read 経路

```
itemStore.loadItems()
  → cmd_list_items() → SQL: SELECT * FROM items WHERE is_enabled=1
  → items[] state 更新 → reactive で LibraryMainArea / LibraryCard に伝搬

itemStore.loadTagWithCounts()
  → cmd_get_tag_counts() → SQL: tag JOIN item_tags COUNT(*)
  → LibrarySidebar に表示

itemStore.loadItemsByTag(tagId, query)
  → cmd_search_items_in_tag(tagId, query)
  → tagItems[] state → LibraryMainArea に表示

LibraryCard.$effect (per item)
  → cmd_get_item_metadata(item.id)  ← 並列発火、I3 元凶
  → metadata 状態を card 内で保持
```

### write 経路

```
ItemForm.handleSubmit()
  → itemStore.createItem(input) or updateItem(id, input)
  → cmd_create_item / cmd_update_item
  → SQL INSERT/UPDATE → items 再 load
```

### Bulk

```
LibraryMainArea bulk select → bulk action button click
  → itemStore.bulkAddTag / bulkRemoveTag / bulkDeleteItems
  → cmd_bulk_*  (transaction、max 1000)
  → items / tagWithCounts 再 load
```

## 2.2 Cross-screen 結合

### Library → Workspace widgets

| widget                   | 結合内容                                                                        | 経路                                             |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| **ItemWidget**           | config.item_ids[] が item ID の配列、`itemStore.items` を pinnedItems で filter | LibraryItemPicker 経由で選択                     |
| **FavoritesWidget**      | `itemStore.items` から sys-starred tag を持つもの抽出                           | tag system 経由                                  |
| **RecentLaunchesWidget** | `cmd_get_recent_launches` で launch_log JOIN items                              | I1 影響あり (ExeFolder からの起動が記録されない) |
| **StatsWidget**          | item_stats から最頻起動 item 抽出                                               | I1 と同じく ExeFolder 起動が反映されない         |
| **ProjectsWidget**       | watched_paths の folder を listing、launchItem(item.id) で起動                  | folder watch + auto-register                     |
| **ExeFolderWatchWidget** | watched_paths + scan で exe をリスト、`cmd_open_path` で raw 起動 ❌            | **I1 root cause**                                |
| **FileSearchWidget**     | system file search で ad-hoc 起動、`cmd_open_path` ❌                           | I1 と同じ pattern                                |

### Workspace → Library

- ItemContextMenu (右クリック) → 「ライブラリで詳細」 → LibraryDetailPanel に遷移
- (ただし現状 deep link なし、Library tab に切替えるだけ)

## 2.3 Tag system (unified taxonomy)

### system tags (auto-create)

- `sys-starred`: お気に入り (toggleStar が add/remove)
- `sys-type-{exe|url|folder|script|command}`: type 分類
- `sys-ws-{workspace_id}`: workspace 紐付け (Workspace 削除時 GC)
- `sys-hidden`: 非表示 (Library に出さない)

### user tags

- 自由に作成可能、`item_tags` で多対多

### 使い手

- LibrarySidebar (display + filter)
- ItemForm (multi-select assign)
- LibraryDetailPanel (display + add/remove)
- Bulk ops (add/remove)
- workspace 内: cmd_search_items_in_tag で filter、widget が自分専用 tag (sys-ws-*) で item を絞る

## 2.4 watched folders → Library auto-registration

```
ExeFolderWatchWidget settings → user adds folder path
  → workspace_widget.config.watch_path 永続化
  → ExeFolderWatchWidget の $effect で scan を発火
  → cmd_auto_register_folder_items(rootPath)
  → 重複 check (target path 一致) → 新規 item 作成 → items table INSERT
  → cmd_extract_item_icon が同期で各 exe を解析 (I3 contributor)
  → itemStore.loadItems() で UI 反映
```

`widget_item_settings` table が `item.target` をキーに settings (default_app / is_enabled) を保持、user が watched_path を unset → 関連 item 削除 → 再 watch しても settings 復元される。

## 2.5 favorites / star system

```
LibraryDetailPanel star button click
  → itemStore.toggleStar(id, starred)
  → cmd_toggle_star(item_id, starred)
  → item_tags に sys-starred を add/remove
  → reactive で LibrarySidebar の count、FavoritesWidget の filter が更新
```

## 2.6 launch path

### 推奨経路 (DB 経由、launch_log 記録あり)

```
launchItem(id) (TS)
  → invoke('cmd_launch_item', { itemId, source: 'workspace' })
  → launch_service::launch_item(db, item_id, source)
  → preflight_check → launcher::launch_exe / launch_url / etc
  → 成功なら record_launch_and_update_stats(launch_log + item_stats)
```

### bypass 経路 (cmd_open_path 直叩き、launch_log 記録なし) ❌ I1 主因

```
ExeFolderWatchWidget.launchEntry / FileSearchWidget
  → invoke('cmd_open_path', { path })
  → OS 標準 open (rust shell::Command::new(...).spawn())
  → launch_log 書かれない
```

→ **Phase L1 で fix**: ExeFolderWatchWidget は scan 時に exe をすでに Library item として auto-register しているので、`launchItem(item.id)` を target path lookup 経由で呼べる。

## 2.7 right-click integration

| 場所                              | menu 内容                                                    |
| --------------------------------- | ------------------------------------------------------------ |
| LibraryCard (右クリック)          | 起動 / 編集 / 削除 / お気に入り / 詳細                       |
| Workspace ItemWidget (右クリック) | open with opener / default 設定 / settings (ItemContextMenu) |

両者で menu items に重複あり (起動 / 編集等)、UX gap として `ux-gaps.md` で扱う。

## 2.8 不確かな点

- **(中)** `cmd_search_items_in_tag` の query 検索が Rust 側で fuzzy なのか substring なのか要 trace
- **(中)** undo (削除取消) の history が現状実装されてるか要 grep (workspace 側は workspaceHistory 有り、Library 側は不明)
- **(低)** widget_item_settings の GC ポリシー (last_seen_at の TTL) 確認
