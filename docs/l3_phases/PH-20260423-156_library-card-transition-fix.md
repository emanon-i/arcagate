---
status: todo
phase_id: PH-20260423-156
scope_files:
  - src/lib/components/arcagate/library/LibraryCard.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-156 LibraryCard `transition-all` → CSS 変数 + motion-reduce

## 背景・目的

`LibraryCard.svelte` が `transition-all` を使用しており、以下の問題がある:

1. `transition-all` は全プロパティを監視するため不必要なプロパティ（border-radius・padding 等）までアニメーション対象になりパフォーマンス劣化
2. Tailwind デフォルト duration（150ms ease）を使用 → `--ag-duration-fast`（120ms）と乖離
3. `motion-reduce:transition-none` がなく `prefers-reduced-motion` 未対応

`active:scale-[0.98]` は既存実装として機能しているが、`transition` が `transform` をカバーしないと scale が瞬間変化になる可能性がある。

## 実装仕様

### LibraryCard.svelte class 変更

**Before:**

```
class="w-full overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-left transition-all hover:border-[var(--ag-border-hover)] hover:bg-[var(--ag-surface-4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-0)] {item.is_enabled ? '' : 'opacity-40 grayscale'}"
```

**After:**

```
class="w-full overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-left transition-[border-color,background-color,transform,box-shadow] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:border-[var(--ag-border-hover)] hover:bg-[var(--ag-surface-4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-0)] {item.is_enabled ? '' : 'opacity-40 grayscale'}"
```

## 受け入れ条件

- [ ] `transition-all` が削除されていること
- [ ] ホバー時 border-color / bg が `--ag-duration-fast` でトランジション
- [ ] `active:scale-[0.98]` が transform トランジションで滑らかに動く
- [ ] `motion-reduce:transition-none` が付与されていること
- [ ] `pnpm verify` 全通過

## 注意事項

- `box-shadow` を含めるのは将来の hover glow 追加（PH-158 等）への布石
- `opacity` と `filter`（grayscale）はアニメーション不要なのでリストから除外
