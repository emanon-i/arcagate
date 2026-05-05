---
id: PH-20260422-088
title: LibraryMainArea starredIds 更新バグ修正 + test.skip 解消
status: done
batch: 18
priority: high
created: 2026-04-22
---

## 背景/目的

`library-empty-starred.spec.ts` の「DetailPanel で ★ ボタンを押すとカードに starred バッジが表示されること」が
`test.skip` でスキップされている。原因は `LibraryMainArea.svelte` の `$effect` 依存宣言のバグ。

## 制約

- `src/lib/state/items.svelte.ts` は変更不要
- Svelte 5 runes の `$effect` 依存追跡の仕様に沿った最小変更のみ

## 根本原因

```svelte
// LibraryMainArea.svelte:64
const _dep = itemStore.items.length;  // ← .length のみ追跡
```

`updateItem` は `items = items.map(...)` で配列を置き換えるが、要素数は変わらない。
Svelte 5 が `.length` しか追跡していないため、$effect が再実行されず `starredIds` が古いまま。

## 修正内容

### `src/lib/components/arcagate/library/LibraryMainArea.svelte`

```diff
-// itemStore.items.length を依存として宣言し、スター操作後に自動再取得する
+// itemStore.items を依存として宣言し、配列参照の変化（追加/削除/タグ更新）で自動再取得する
 let starredIds = $state<Set<string>>(new Set());

 $effect(() => {
-    const _dep = itemStore.items.length;
+    const _dep = itemStore.items;
     void searchItemsInTag('sys-starred', '').then((items) => {
         starredIds = new Set(items.map((i) => i.id));
     });
 });
```

### `tests/e2e/library-empty-starred.spec.ts`

`test.skip(...)` を削除してテストを有効化する。

## 受け入れ条件

- [ ] `pnpm verify` 全通過（biome / dprint / clippy / svelte-check / cargo test / vitest）
- [ ] `library-empty-starred.spec.ts` の starred バッジテストが `test.skip` なしで通過すること

## scope_files

- `src/lib/components/arcagate/library/LibraryMainArea.svelte`
- `tests/e2e/library-empty-starred.spec.ts`

## parallel_safe

true
