---
status: todo
phase_id: PH-20260423-152
scope_files:
  - src/lib/components/arcagate/common/SidebarRow.svelte
  - src/lib/components/arcagate/palette/PaletteResultRow.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-152 SidebarRow / PaletteResultRow トランジション標準化

## 背景・目的

以下のコンポーネントが「裸の `transition`」を使用しており、Tailwind デフォルト（`150ms ease`）に依存している。
`--ag-duration-fast`（120ms）/ `--ag-ease-in-out` への統一と `motion-reduce:transition-none` 追加が必要。

| ファイル                  | 現在の問題                                                                      |
| ------------------------- | ------------------------------------------------------------------------------- |
| `SidebarRow.svelte`       | iconOnly ブランチの button に裸 `transition`、full ブランチは `transition` なし |
| `PaletteResultRow.svelte` | 裸の `transition`、`active:` なし、`motion-reduce` なし                         |

## 実装仕様

### SidebarRow.svelte

**iconOnly ブランチ (line 19 付近):**

Before:

```
class="flex items-center justify-center rounded-lg p-2 transition {active ...
```

After:

```
class="flex items-center justify-center rounded-lg p-2 transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none {active ...
```

**full ブランチ (line 30 付近) — トランジションを追加:**

Before:

```
class="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm {active
```

After:

```
class="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none {active
```

### PaletteResultRow.svelte

Before:

```
class="flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 transition {active
```

After:

```
class="flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 transition-[border-color,background-color,box-shadow] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none {active
```

## 受け入れ条件

- [ ] SidebarRow: iconOnly / full 両ブランチでホバー色変化が `--ag-duration-fast` でトランジション
- [ ] PaletteResultRow: active 切り替え時に border-color / bg / shadow が滑らかに変化
- [ ] `motion-reduce` 環境でトランジション無効
- [ ] `pnpm verify` 全通過

## 注意事項

- PaletteResultRow の `transition-[border-color,background-color,box-shadow]` は意図的に限定。`transition-all` にすると `rounded-[22px]` 等の不要プロパティもトランジションしてしまう
