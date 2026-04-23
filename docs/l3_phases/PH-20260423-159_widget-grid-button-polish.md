---
status: todo
phase_id: PH-20260423-159
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte
  - src/lib/components/arcagate/workspace/PageTabBar.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-159 WorkspaceWidgetGrid ボタン polish + PageTabBar 追加ボタン polish

## 背景・目的

### WorkspaceWidgetGrid.svelte

3 つのオーバーレイボタン（ドラッグハンドル・削除ボタン・リサイズハンドル）に transition がなく、`hover:bg` が瞬時に切り替わる。
また削除ボタン（destructive）は `hover:opacity` のみで `active:scale` がない。

| 対象                                                | 現在            | 問題               |
| --------------------------------------------------- | --------------- | ------------------ |
| ドラッグハンドル `.../80 hover:bg-[...]`            | transition なし | ホバー色変化が瞬時 |
| 削除ボタン `bg-destructive/80 hover:bg-destructive` | transition なし | ホバー色変化が瞬時 |
| リサイズハンドル `bg-accent/50 hover:bg-accent`     | transition なし | ホバー色変化が瞬時 |

### PageTabBar.svelte

`+ ページを追加` ボタン（破線ボーダー）に hover:/active:/focus-visible: がなく、インタラクション状態が全くない。

## 実装仕様

### WorkspaceWidgetGrid.svelte — 3 ボタンに transition 追加

**ドラッグハンドル div:**

```
class="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--ag-surface-4)]/80 transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
```

**削除ボタン button:**

```
class="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-white transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-destructive active:scale-[0.95]"
```

**リサイズハンドル div:**

```
class="absolute bottom-1 right-1 flex h-6 w-6 cursor-se-resize items-center justify-center rounded bg-[var(--ag-accent)]/50 shadow transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-accent)]"
```

### PageTabBar.svelte — `+ ページを追加` ボタン polish

**Before:**

```svelte
<button
  type="button"
  class="rounded-full border border-dashed border-[var(--ag-border-dashed)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)]"
  onclick={startAdd}
>
```

**After:**

```svelte
<button
  type="button"
  class="rounded-full border border-dashed border-[var(--ag-border-dashed)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)] transition-[color,border-color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-accent-border)] hover:text-[var(--ag-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
  onclick={startAdd}
>
```

## 受け入れ条件

- [ ] ドラッグハンドルホバー時に bg が `--ag-duration-fast` でトランジション
- [ ] 削除ボタンホバー時に bg がトランジション、クリック時に `scale(0.95)` プレス感
- [ ] リサイズハンドルホバー時に bg がトランジション
- [ ] `+ ページを追加` ホバー時に border/text が accent 色へトランジション
- [ ] `+ ページを追加` Tab フォーカス時に cyan リング表示
- [ ] 全要素で `motion-reduce:transition-none`
- [ ] `pnpm verify` 全通過

## 注意事項

- `WorkspaceWidgetGrid` のドラッグハンドルとリサイズハンドルは `div` 要素（`aria-label` 付き）。`focus-visible:ring` は `button` でないため付与しない
- 削除ボタンのみ `button` なので `focus-visible:ring` を追加してもよいが、編集モード専用の小さなボタンなのでスコープから除外
