---
status: todo
phase_id: PH-20260422-015
title: LibraryCard スターバッジ + itemStore.starredIds
depends_on:
  - PH-20260422-013
scope_files:
  - src/lib/state/items.svelte.ts
  - src/lib/components/arcagate/library/LibraryCard.svelte
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
parallel_safe: false
---

# PH-20260422-015: LibraryCard スターバッジ表示

## 目的

PH-20260422-013 で sys:starred タグが追加された。\
Library カード一覧でスター付きアイテムを視覚的に識別できるよう、\
LibraryCard に ★ バッジを追加する。

## 設計判断

- N+1 問題回避のため、アイテム一覧ロード時に `cmd_search_items_in_tag("sys-starred")` を一度だけ呼び、
  `starredItemIds: Set<string>` として itemStore に保持する
- `itemStore.updateItem` でタグ変更があった場合は starredIds も更新する（loadStarredIds を再呼び出し）
- LibraryCard に `isStarred: boolean` prop を追加する（LibraryMainArea で渡す）

## 実装ステップ

### Step 1: itemStore に starredIds を追加

```typescript
// items.svelte.ts
let starredItemIds = $state<Set<string>>(new Set());

async function loadStarredIds() {
    const items = await searchItemsInTag('sys-starred');
    starredItemIds = new Set(items.map(i => i.id));
}

// loadItems() の末尾で呼ぶ
// updateItem() の末尾（タグ変更時）で再呼び出し
```

### Step 2: LibraryCard に isStarred prop 追加

```svelte
<!-- LibraryCard.svelte -->
interface Props {
    item: Item;
    isStarred?: boolean;
    onclick?: () => void;
    ondblclick?: () => void;
}
```

カード右上に絶対配置で ★ バッジ:

```svelte
{#if isStarred}
    <span class="absolute right-2 top-2 text-sm text-[var(--ag-accent)]" aria-label="スター付き">★</span>
{/if}
```

### Step 3: LibraryMainArea で isStarred を渡す

```svelte
<LibraryCard
    {item}
    isStarred={itemStore.starredItemIds.has(item.id)}
    ...
/>
```

### Step 4: IPC ヘルパー確認

`cmd_search_items_in_tag` が `items.ts` IPC に存在するか確認し、なければ追加。

### Step 5: pnpm verify

## コミット規約

`feat(PH-20260422-015): LibraryCard にスターバッジ表示 + itemStore.starredIds`

## 受け入れ条件

- [ ] スター付きアイテムのカードに ★ バッジが表示される
- [ ] DetailPanel でスターをトグルするとカードのバッジがリアクティブに更新される
- [ ] 大量アイテムでも N+1 なし（`loadStarredIds` は一度だけ呼ばれる）
- [ ] `pnpm verify` 通過

## 停止条件

- `cmd_search_items_in_tag` の IPC が意図した形でアイテムを返さない → 停止して調査
