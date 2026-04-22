---
status: todo
phase_id: PH-20260422-034
title: Library 検索バー `/` キーショートカット追加
depends_on: []
scope_files:
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
parallel_safe: true
---

# PH-20260422-034: Library 検索バー `/` キーショートカット追加

## 目的

Library タブで `/` キーを押すと検索バーにフォーカスが当たるようにする。
現状は検索バーをマウスでクリックするか Tab キーで移動するしか方法がなく、
キーボード主体のユーザーには操作ステップが多い。

## 現状

```svelte
<!-- LibraryMainArea.svelte: 検索入力に id/ref なし、/ ショートカットなし -->
<input
    type="text"
    class="..."
    bind:value={searchQuery}
/>
```

## 設計判断

- `svelte:window` の `onkeydown` で `/` キー押下を検知
- `event.target` がテキスト入力系でない場合のみ発動（既に入力中の誤発動を防ぐ）
- `searchInputEl = $state<HTMLInputElement | null>(null)` を追加して `bind:this`
- `e.preventDefault()` で `/` 文字の挿入を防ぐ
- Escape で検索クリア + フォーカス解除（既存の Escape ハンドラ拡張）

## 実装ステップ

### Step 1: searchInputEl state と bind:this 追加

```typescript
let searchInputEl = $state<HTMLInputElement | null>(null);
```

```svelte
<input bind:this={searchInputEl} ... />
```

### Step 2: svelte:window onkeydown に / ショートカット追加

既存の Escape ハンドラに追記:

```svelte
<svelte:window
    onkeydown={(e) => {
        if (e.key === '/') {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                searchInputEl?.focus();
            }
        }
        if (e.key === 'Escape') onSelectItem?.(null);
    }}
/>
```

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-034): Library 検索バー / キーショートカット追加`

## 受け入れ条件

- [ ] `pnpm verify` 通過（svelte-check WARNING 0）
- [ ] Library タブで `/` キーを押すと検索バーにフォーカスが当たること
- [ ] 検索バーや他の入力欄にフォーカス中は `/` で二重発動しないこと

## 停止条件

- LibraryMainArea に既に `<svelte:window>` が複数あり統合が難しい → 調査して報告
