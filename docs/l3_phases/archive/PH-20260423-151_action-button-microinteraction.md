---
status: done
phase_id: PH-20260423-151
scope_files:
  - src/lib/components/arcagate/common/ActionButton.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-151 ActionButton マイクロインタラクション追加

## 背景・目的

`ActionButton.svelte` は現在 `hover:bg-[var(--ag-surface-4)]` のみで、以下が欠落している:

- `transition` クラスなし → ホバー色変化がカクつく
- `active:scale` なし → プレス感ゼロ
- `focus-visible:ring` なし → キーボードフォーカスが見えない
- `motion-reduce:transition-none` なし → reduced-motion 未対応

ux_standards.md §5「インタラクションフィードバック」の 4 状態要件（hover / active / focus / disabled）を満たすため修正する。

## 実装仕様

### ActionButton.svelte class 変更

**Before:**

```
class="flex items-center justify-center gap-2 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-3 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
```

**After:**

```
class="flex items-center justify-center gap-2 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-3 text-sm text-[var(--ag-text-secondary)] transition-[color,background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
```

## 受け入れ条件

- [ ] ホバー時に背景色が `--ag-duration-fast` でトランジションする
- [ ] クリック時に `scale(0.97)` のプレス感がある
- [ ] Tab キーフォーカス時に cyan リングが表示される
- [ ] `prefers-reduced-motion: reduce` 環境でトランジションが無効になる（CSS vars が 0ms になる）
- [ ] `pnpm verify` 全通過

## 注意事項

- shadcn `src/lib/components/ui/` は編集禁止。ActionButton は独自コンポーネントなので対象外
- `active:scale` は `transform` トランジションが必要なため `transition-[color,background-color,transform]` で 2 プロパティをカバー
