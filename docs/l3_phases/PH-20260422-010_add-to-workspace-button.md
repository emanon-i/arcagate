---
status: todo
phase_id: PH-20260422-010
title: LibraryDetailPanel「ワークスペースに追加」ボタン
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
  - src/lib/state/workspace.svelte.ts
parallel_safe: true
---

# PH-20260422-010: ワークスペースに追加ボタン

## 目的

dispatch-log A に記録した「ウィジェット追加フローの摩擦」を改善する。\
現状は Library アイテムを Workspace のウィジェットに追加するには\
「編集モード切替 → サイドバーから D&D」の複数ステップが必要。\
`LibraryDetailPanel` に「Favorites に追加」ボタンを設けることで\
Library から直接 1 クリックで Workspace のお気に入りリストに追加できるようにする。

## 設計判断

- 追加先は「Favorites ウィジェット」に限定する（UI の単純化のため）
- 実装は `configStore` か `workspaceStore` 内の favorites IPC を利用
- Favorites は「頻繁に起動したアイテム」を表示するウィジェット（`getFrequentItems` IPC）なので、
  「お気に入り」は既存の is_tracked フラグまたは favorite タグで表現
- `is_tracked` が既に「ライブラリに表示する」フラグなので使えない
- **アプローチ**: アイテムに system タグ「favorites」（`sys:favorites`）を付与し、
  FavoritesWidget が `getFrequentItems` ではなく「favorites タグのアイテム」を表示する方式に変更する

## 事前調査が必要な項目

Step 1 で以下を確認してから実装方針を確定:

1. `itemStore.tagWithCounts` に `sys:favorites` 相当のシステムタグが存在するか
2. FavoritesWidget が `getFrequentItems` を使っているか、それともタグベースか
3. 既存の「favorite」「お気に入り」実装がないか grep で確認

もし大規模変更が必要と判明した場合は **停止して報告**。

## 実装ステップ

### Step 1: 事前調査

```
grep -r "favorites\|favorite\|sys:fav" src/lib/
```

- `sys:favorites` タグが存在 → Step 2a（タグ付与ボタン）
- 存在しない → Step 2b（新規システムタグ定義）

### Step 2a: タグ付与ボタン追加（sys:favorites 存在の場合）

`LibraryDetailPanel` の Action buttons セクションに追加:

```svelte
<ActionButton icon={Star} label="Favorites 追加" onclick={handleAddToFavorites} />
```

`handleAddToFavorites` は `handleAddTag(SYS_FAVORITES_TAG_ID)` を呼ぶ。

### Step 2b: 新規システムタグ定義（存在しない場合）

- 停止して報告（DB マイグレーションが必要な場合は別 Plan）

### Step 3: FavoritesWidget の表示切替確認

- FavoritesWidget が `getFrequentItems` ベースの場合、タグ付与しても表示されない
- この場合は **FavoritesWidget の表示ロジック変更が必要 → 停止して報告**

## コミット規約

`feat(PH-20260422-010): LibraryDetailPanel に「Favorites に追加」ボタンを追加`

## 受け入れ条件

- [ ] LibraryDetailPanel に「Favorites に追加 / 解除」ボタンが表示される
- [ ] ボタンクリックでアイテムの favorites タグが付与/解除される
- [ ] `pnpm verify` 通過

## Exit Criteria

受け入れ条件 3 つがすべて [x]

## 停止条件

- FavoritesWidget がタグベースでなく `getFrequentItems` ベースであり、表示切替に FavoritesWidget の大規模変更が必要 → 停止して報告
- DB マイグレーションが必要 → 停止して報告
