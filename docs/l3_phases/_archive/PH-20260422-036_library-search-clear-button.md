---
status: done
phase_id: PH-20260422-036
title: Library 検索バー クリアボタン追加
depends_on: []
scope_files:
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
parallel_safe: true
---

# PH-20260422-036: Library 検索バー クリアボタン追加

## 目的

検索クエリを入力した後、全選択して削除するしかクリア方法がない。
`×` ボタンを検索バー右端に表示し、1 クリックでクリアできるようにする。

## 現状

```svelte
<!-- LibraryMainArea.svelte: クリアボタンなし -->
<div class="flex min-w-0 flex-1 items-center gap-3 ...">
    <Search class="h-5 w-5 text-[var(--ag-text-muted)]" />
    <input ... bind:value={searchQuery} />
</div>
```

## 設計判断

- `searchQuery` が空でない場合のみ `×` ボタンを表示（`{#if searchQuery}`）
- クリック時に `searchQuery = ''` + 検索入力にフォーカスを戻す
- アイコンは `X` from `@lucide/svelte`（既存 import を再利用する場合は確認）

## 実装ステップ

### Step 1: LibraryMainArea.svelte を読んで検索バー部分を確認

### Step 2: クリアボタン追加

```svelte
{#if searchQuery}
    <button
        type="button"
        class="rounded-full p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
        aria-label="検索をクリア"
        onclick={() => { searchQuery = ''; searchInputEl?.focus(); }}
    >
        <XIcon class="h-4 w-4" />
    </button>
{/if}
```

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-036): Library 検索バーにクリアボタン追加`

## 受け入れ条件

- [x] `pnpm verify` 通過（svelte-check WARNING 0）
- [x] 検索クエリ入力中に × ボタンが表示されること
- [x] × クリックで検索クエリがクリアされ検索バーにフォーカスが戻ること
- [x] 空欄時は × ボタンが非表示になること

## 停止条件

- PH-20260422-034 と同一ファイルの変更が競合する → 034 完了後に実装
