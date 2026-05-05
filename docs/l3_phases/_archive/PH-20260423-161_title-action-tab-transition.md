---
status: done
phase_id: PH-20260423-161
scope_files:
  - src/lib/components/arcagate/common/TitleAction.svelte
  - src/lib/components/arcagate/common/TitleTab.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-161 TitleAction + TitleTab トランジション標準化

## 背景・目的

`TitleAction.svelte` と `TitleTab.svelte` の両コンポーネントが bare `transition` を使用している。
他コンポーネント同様に CSS 変数トークン + `motion-reduce:transition-none` に統一し、
インタラクション状態（`active:scale`・`focus-visible:ring`）を追加する。

| コンポーネント | 現在         | 問題                                   |
| -------------- | ------------ | -------------------------------------- |
| TitleAction    | `transition` | 対象プロパティ不明・motion-reduce なし |
| TitleTab       | `transition` | 対象プロパティ不明・motion-reduce なし |

## 実装仕様

### TitleAction.svelte

**Before:**

```svelte
class="inline-flex items-center justify-center rounded-lg border p-1.5 transition {toneClasses[tone]}"
```

**After:**

```svelte
class="inline-flex items-center justify-center rounded-lg border p-1.5 transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {toneClasses[tone]}"
```

### TitleTab.svelte

**Before:**

```svelte
class="flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs transition {active
    ? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-active-bg)] text-[var(--ag-text-primary)]'
    : 'border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)]'}"
```

**After:**

```svelte
class="flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {active
    ? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-active-bg)] text-[var(--ag-text-primary)]'
    : 'border-[var(--ag-border)] bg-[var(--ag-surface-2)] text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)]'}"
```

## 受け入れ条件

- [ ] TitleAction: hover 色変化が `--ag-duration-fast` でトランジション
- [ ] TitleAction: クリック時に `scale(0.97)` プレス感
- [ ] TitleAction: Tab フォーカス時に cyan リング
- [ ] TitleTab: アクティブ/非アクティブ切り替えがトランジション
- [ ] TitleTab: クリック時に `scale(0.97)` プレス感
- [ ] 両コンポーネントで `motion-reduce:transition-none`
- [ ] `pnpm verify` 全通過
