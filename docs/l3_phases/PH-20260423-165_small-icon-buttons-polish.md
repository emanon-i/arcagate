---
status: done
phase_id: PH-20260423-165
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte
  - src/lib/components/arcagate/common/WidgetShell.svelte
  - src/lib/components/arcagate/common/MoreMenu.svelte
  - src/lib/components/arcagate/common/Tip.svelte
  - src/lib/components/arcagate/palette/PaletteSearchBar.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-165 WorkspaceSidebar + 小アイコンボタン polish（整理）

## 背景・目的

複数のコンポーネントに共通する「小アイコンボタンに `hover:` があるが `transition` なし」パターンと、
`WorkspaceSidebar` の inline `transition: width` が `prefers-reduced-motion` 非対応である問題をまとめて整理する。

### 対象箇所

| ファイル                  | 内容                                                               |
| ------------------------- | ------------------------------------------------------------------ |
| `WorkspaceSidebar.svelte` | `style` の `transition: width` → motion-reduce 非対応              |
| `WorkspaceSidebar.svelte` | 確定/キャンセル/編集ボタンに transition なし                       |
| `WidgetShell.svelte`      | アイコンボタン `hover:bg-[var(--ag-surface-3)]` に transition なし |
| `MoreMenu.svelte`         | アイコンボタン `hover:bg-[var(--ag-surface-3)]` に transition なし |
| `Tip.svelte`              | アイコンボタン `hover:bg-[var(--ag-surface-4)]` に transition なし |
| `PaletteSearchBar.svelte` | クリアボタン `hover:bg-[var(--ag-surface-4)]` に transition なし   |

## 実装仕様

### WorkspaceSidebar.svelte — motion-reduce 対応

`<script>` に追加:

```typescript
const rm =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

`<aside>` の inline style を更新:

```svelte
style="width: {editMode ? '200px' : '48px'};{rm ? '' : ' transition: width var(--ag-duration-fast) var(--ag-ease-in-out);'}"
```

### WorkspaceSidebar.svelte — 確定/キャンセルボタン

```
transition-[color,background-color] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none
```

を各ボタンに追加。

### 小アイコンボタン共通パターン（WidgetShell / MoreMenu / Tip / PaletteSearchBar）

各コンポーネントの該当ボタンに追加:

```
transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none
```

## 受け入れ条件

- [ ] WorkspaceSidebar: 幅切り替えが `prefers-reduced-motion` 時にアニメーションなしになる（JS 確認）
- [ ] WorkspaceSidebar: 確定/キャンセルボタンに transition
- [ ] WidgetShell / MoreMenu / Tip / PaletteSearchBar: アイコンボタンホバーが滑らか
- [ ] `motion-reduce:transition-none` 全追加
- [ ] `pnpm verify` 全通過
