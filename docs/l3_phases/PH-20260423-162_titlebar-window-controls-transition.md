---
status: todo
phase_id: PH-20260423-162
scope_files:
  - src/lib/components/arcagate/common/TitleBar.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-162 TitleBar ウィンドウコントロール ボタン polish

## 背景・目的

`TitleBar.svelte` のウィンドウコントロール 3 ボタン（最小化・最大化/元に戻す・閉じる）に
`transition` が一切ない。ホバー色変化が瞬時で統一感を欠く。

| ボタン          | 現在クラス                             | 問題            |
| --------------- | -------------------------------------- | --------------- |
| 最小化          | `hover:bg-[var(--ag-surface-3)]`       | transition なし |
| 最大化/元に戻す | `hover:bg-[var(--ag-surface-3)]`       | transition なし |
| 閉じる          | `hover:bg-red-500/80 hover:text-white` | transition なし |

## 実装仕様

3 ボタン共通ベースクラスに `transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none` を追加する。
`focus-visible` と `active:scale` は付与しない（ウィンドウコントロールはマウス専用操作が主であり、スケールでの視覚的フィードバックは不自然）。

**最小化・最大化ボタン After:**

```svelte
class="inline-flex h-10 w-10 items-center justify-center text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)]"
```

**閉じるボタン After:**

```svelte
class="inline-flex h-10 w-10 items-center justify-center text-[var(--ag-text-secondary)] transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-red-500/80 hover:text-white"
```

## 受け入れ条件

- [ ] 最小化・最大化ボタンホバー時に bg が `--ag-duration-fast` でトランジション
- [ ] 閉じるボタンホバー時に bg/text が `--ag-duration-fast` でトランジション
- [ ] 全 3 ボタンで `motion-reduce:transition-none`
- [ ] `pnpm verify` 全通過

## 注意事項

- `TitleBar.svelte` は `src/lib/components/ui/` ではなく `src/lib/components/arcagate/common/` にあるため編集可
