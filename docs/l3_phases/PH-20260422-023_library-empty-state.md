---
status: done
phase_id: PH-20260422-023
title: Library 空状態ガイド改善
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
parallel_safe: true
---

# PH-20260422-023: Library 空状態ガイド改善

## 目的

Library にアイテムがない初期状態は「アイテムがまだありません」というテキストのみで、
ユーザーに次のアクションを示していない。
初回体験を改善し、アイテム追加へ誘導するガイドを表示する。

## 現状

```svelte
<!-- LibraryMainArea.svelte -->
{#if filteredItems.length === 0}
    <div class="col-span-full py-12 text-center text-sm text-[var(--ag-text-muted)]">
        {searchQuery ? `「${searchQuery}」に一致するアイテムはありません` : 'アイテムがまだありません'}
    </div>
{/if}
```

## 設計判断

- 検索クエリなし + アイテム数 0 の場合: 「アイテムを追加」ボタンへの誘導 + 手順説明
- 検索クエリあり + 結果 0 の場合: 現状維持（検索ヒットなしメッセージ）
- タグフィルタ中 + 結果 0 の場合: 「このタグにアイテムがありません」

## 実装ステップ

### Step 1: 空状態コンポーネント（インライン）

```svelte
{:else if !searchQuery && !activeTag && itemStore.items.length === 0}
    <!-- 真の空状態 -->
    <div class="col-span-full flex flex-col items-center justify-center py-16 gap-4">
        <div class="rounded-full bg-[var(--ag-surface-4)] p-4">
            <Package class="h-8 w-8 text-[var(--ag-text-muted)]" />
        </div>
        <div class="text-center">
            <p class="text-sm font-medium text-[var(--ag-text-primary)]">ライブラリが空です</p>
            <p class="mt-1 text-xs text-[var(--ag-text-muted)]">
                アプリ・フォルダ・URL などのショートカットを追加できます
            </p>
        </div>
        <button
            type="button"
            class="flex items-center gap-2 rounded-[var(--ag-radius-card)] bg-[var(--ag-accent)] px-4 py-2 text-sm text-white hover:opacity-90"
            onclick={() => onAddItem?.()}
        >
            <Plus class="h-4 w-4" />
            アイテムを追加
        </button>
    </div>
{:else if filteredItems.length === 0}
    <!-- 検索/タグフィルタで 0 件 -->
    ...（現状のメッセージ）
```

### Step 2: pnpm verify

## コミット規約

`feat(PH-20260422-023): Library 空状態ガイド改善（初回体験向上）`

## 受け入れ条件

- [x] `pnpm verify` 通過（svelte-check WARNING 0）
- [x] アイテム 0 の状態でガイドメッセージと「アイテムを追加」ボタンが表示されること
- [x] 「アイテムを追加」ボタンクリックで追加フォームが開くこと
- [x] 検索結果 0 件では「一致なし」メッセージが表示されること（ガイドに変わらないこと）

## 停止条件

- `onAddItem` prop が LibraryMainArea に到達していないことが判明 → 呼び出し元を調査して報告
