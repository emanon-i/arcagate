---
id: PH-20260422-093
title: PaletteSearchBar クリアボタン追加
status: done
batch: 20
priority: medium
created: 2026-04-22
parallel_safe: true
scope_files:
  - src/lib/components/arcagate/palette/PaletteSearchBar.svelte
---

## 背景/目的

Library 検索バーには X クリアボタンが存在するが（PH-036 実装済み）、
パレット検索バーには存在しない。パレット開放後にクエリを消したい場合、
Esc（= パレットを閉じる）しか手段がない。X ボタンでクリアのみできると便利。

## 修正内容

`PaletteSearchBar.svelte` に X ボタンを追加:

```svelte
import { Search, X as XIcon } from '@lucide/svelte';
// ...
{#if query}
    <button
        type="button"
        class="rounded-full p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
        aria-label="検索をクリア"
        onclick={() => { query = ''; onSearch?.(''); inputEl?.focus(); }}
    >
        <XIcon class="h-4 w-4" />
    </button>
{/if}
```

`inputEl` バインドのために `bind:this={inputEl}` を `<input>` に追加する。

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] クエリが空でないときに X ボタンが表示されること
- [ ] X ボタンクリックでクエリがクリアされ、空検索結果（recent/frequent）が表示されること
