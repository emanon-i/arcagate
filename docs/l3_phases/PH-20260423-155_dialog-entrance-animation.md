---
status: todo
phase_id: PH-20260423-155
scope_files:
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceDeleteConfirmDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceRenameDialog.svelte
  - src/lib/components/item/ItemFormDialog.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-155 ダイアログ開閉アニメーション

## 背景・目的

ワークスペース系ダイアログ 3 本と ItemFormDialog が `{#if dialogOpen}` / `{#if open}` による瞬時表示で、開閉時の視覚的フィードバックがない。
バックドロップのフェードイン + カードのスケール+フェードイン を追加し、ux_standards.md §6「ダイアログ」の仕様を満たす。

## 実装仕様（全 4 ファイル共通パターン）

### `<script>` 追加（各ファイルに追記）

```typescript
import { fade, scale } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

const rm = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
```

### テンプレートパターン（`{#if dialogOpen}` または `{#if open}` 内）

```svelte
{#if dialogOpen}
  <!-- バックドロップ -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    transition:fade={{ duration: dFast }}
    onclick={...}
    onkeydown={...}
  >
    <!-- ダイアログカード -->
    <div
      class="w-full max-w-sm ..."
      transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
    >
```

### 各ファイルの条件変数名

| ファイル                              | 条件変数                    |
| ------------------------------------- | --------------------------- |
| `WidgetSettingsDialog.svelte`         | `dialogOpen`                |
| `WorkspaceDeleteConfirmDialog.svelte` | 要確認（`open` 可能性あり） |
| `WorkspaceRenameDialog.svelte`        | 要確認（`open` 可能性あり） |
| `ItemFormDialog.svelte`               | 要確認（`open` 可能性あり） |

実装時に各ファイルの Props を確認してから適用する。

## 受け入れ条件

- [ ] ダイアログ開時: バックドロップが 120ms フェードイン、カードが 200ms scale（0.96→1）+ fade
- [ ] ダイアログ閉時: 逆アニメーション（scale 1→0.96 + fade）で 120ms
- [ ] `prefers-reduced-motion: reduce` 環境でアニメーションなし
- [ ] `pnpm verify` 全通過（svelte-check a11y エラーなし）

## 注意事項

- `transition:scale` と `transition:fade` を同一要素に付与できないため、バックドロップ外 div に `fade`、カード div に `scale` を分けて適用する
- ItemFormDialog は大きめのフォームダイアログ。`max-w-sm` ではなく `max-w-lg` 等の可能性があるが、アニメーション適用箇所は同じパターン
- Svelte `transition:` の `start` パラメータは scale の開始値（0.96 = 96%）
- バックドロップ div は `role="dialog"` を保持したまま `transition:` を追加する
