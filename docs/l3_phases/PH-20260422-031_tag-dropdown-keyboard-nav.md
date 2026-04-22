---
status: todo
phase_id: PH-20260422-031
title: LibraryDetailPanel タグドロップダウン キーボードナビゲーション
depends_on:
  - PH-20260422-025
scope_files:
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
parallel_safe: true
---

# PH-20260422-031: LibraryDetailPanel タグドロップダウン キーボードナビゲーション

## 目的

PH-20260422-025 でドロップダウンの Escape/外部クリック閉じを実装したが、
ドロップダウン内のキーボードナビゲーション（↑↓ 移動・Enter 選択）が未実装。
マウス操作のみでしか選択できないため、キーボード操作者の UX が不完全。

## 現状

```svelte
<!-- LibraryDetailPanel.svelte: mouse click のみ対応 -->
{#each availableTags as tag (tag.id)}
    <button
        type="button"
        onclick={() => { void handleAddTag(tag.id); showTagSelect = false; }}
    >
        {tag.name}
    </button>
{/each}
```

## 設計判断

- `focusedTagIndex = $state(-1)` を追加してフォーカス位置を追跡
- ドロップダウンを開いた直後に最初のアイテムにフォーカス
- `↓` で次、`↑` で前に移動（循環なし、端でストップ）
- `Enter` で `handleAddTag()` を実行して閉じる
- `Tab` での移動もサポート（`tabindex={focused ? 0 : -1}` で制御）
- Escape 処理は PH-20260422-025 で実装済みのため変更不要

## 実装ステップ

### Step 1: focusedTagIndex の state と keyboard handler 追加

```typescript
let focusedTagIndex = $state(-1);

// ドロップダウンを開いたときに最初のアイテムにフォーカス
$effect(() => {
    if (showTagSelect && availableTags.length > 0) {
        focusedTagIndex = 0;
    } else {
        focusedTagIndex = -1;
    }
});
```

### Step 2: ドロップダウンの button に tabindex と ref 付与

```svelte
{#each availableTags as tag, i (tag.id)}
    <button
        type="button"
        class="..."
        tabindex={focusedTagIndex === i ? 0 : -1}
        onkeydown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); focusedTagIndex = Math.min(i + 1, availableTags.length - 1); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); focusedTagIndex = Math.max(i - 1, 0); }
            if (e.key === 'Enter')     { void handleAddTag(tag.id); showTagSelect = false; }
        }}
        onclick={() => { void handleAddTag(tag.id); showTagSelect = false; }}
    >
        {tag.name}
    </button>
{/each}
```

### Step 3: $effect で focusedTagIndex 変化時にフォーカスを当てる

```typescript
let tagButtonEls = $state<(HTMLButtonElement | null)[]>([]);

$effect(() => {
    if (focusedTagIndex >= 0 && tagButtonEls[focusedTagIndex]) {
        tagButtonEls[focusedTagIndex]?.focus();
    }
});
```

### Step 4: pnpm verify

## コミット規約

`feat(PH-20260422-031): タグドロップダウン ↑↓ キーボードナビゲーション追加`

## 受け入れ条件

- [ ] `pnpm verify` 通過（svelte-check WARNING 0）
- [ ] ドロップダウンを開いた直後に最初のタグにフォーカスが当たること
- [ ] ↓↑ キーでタグ間をナビゲートできること
- [ ] Enter キーでタグが追加されドロップダウンが閉じること

## 停止条件

- `bind:this` を配列に適用する構文が Svelte 5 で機能しない → 代替案を調査して報告
