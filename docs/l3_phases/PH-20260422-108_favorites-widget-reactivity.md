---
id: PH-20260422-108
title: FavoritesWidget リアクティブ更新（itemStore 依存追加）
status: done
batch: 24
priority: high
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/FavoritesWidget.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

`FavoritesWidget.svelte` の `$effect` は `widget?.config` にのみ依存している。
`LibraryDetailPanel` でアイテムをスター/アンスターしても `itemStore.items` を参照しないため、
FavoritesWidget が自動更新されない。

```svelte
// 現状: widget?.config の変化のみ再実行される
$effect(() => {
  const { max_items: limit } = parseWidgetConfig(widget?.config, { max_items: 10 });
  void searchItemsInTag('sys-starred', '').then((items) => {
    favorites = items.slice(0, limit);
  });
});
```

## 実装内容

`$effect` 内で `itemStore.items` を読み取り（参照するだけ）、
Svelte 5 の fine-grained reactivity により items が変化したら再実行されるようにする。

```svelte
$effect(() => {
  const _dep = itemStore.items; // スター変更時に再実行させるための依存追跡
  const { max_items: limit } = parseWidgetConfig(widget?.config, { max_items: 10 });
  void searchItemsInTag('sys-starred', '').then((items) => {
    favorites = items.slice(0, limit);
  });
});
```

## 注意事項

- `lessons.md` の「Svelte 5 `$effect` の配列依存追跡」教訓参照:
  配列の length ではなく配列参照自体を追跡すること（`const _dep = itemStore.items`）
- `itemStore` の import を追加すること
- `searchItemsInTag` の IPC 呼び出しが増えることは許容範囲（個人アプリ）

## 受け入れ条件

- [ ] `const _dep = itemStore.items` で依存追跡が追加されていること
- [ ] `itemStore` が import されていること
- [ ] biome / svelte-check 0 errors
