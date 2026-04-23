---
status: todo
phase_id: PH-20260423-153
scope_files:
  - src/lib/components/arcagate/palette/PaletteOverlay.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-153 PaletteOverlay 開閉アニメーション

## 背景・目的

`PaletteOverlay.svelte` は `{#if open}` による瞬時表示/非表示のみで、開閉アニメーションがない。
バックドロップのフェードインとパレットカードの fly アニメーションを追加し、視覚的な連続性を確保する。

## 実装仕様

### `<script>` 追加インポートと prefers-reduced-motion 定数

```typescript
import { fade, fly } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

const rm = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
```

### バックドロップ（inline モード限定）

```svelte
{#if mode === 'inline'}
  <button
    type="button"
    class="absolute inset-0 bg-black/50 backdrop-blur-sm"
    aria-label="パレットを閉じる"
    onclick={close}
    tabindex="-1"
    transition:fade={{ duration: dFast }}
  ></button>
{/if}
```

### パレットカード（最外の `relative mx-auto mt-[5vh]...` div）

```svelte
<div
  class="relative mx-auto mt-[5vh] max-w-5xl ..."
  in:fly={{ y: -12, duration: dNormal, easing: cubicOut }}
  out:fade={{ duration: dFast }}
>
```

`in` と `out` を分けることで、表示時は fly（上から降りてくる）、非表示時は fade のみで素早く消える。

## 受け入れ条件

- [ ] パレット開時: バックドロップが 120ms フェードイン、カードが 200ms fly で降下
- [ ] パレット閉時: カードが 120ms でフェードアウト
- [ ] floating モードではバックドロップなし（既存動作と同様）
- [ ] `prefers-reduced-motion: reduce` 環境ではアニメーションなし（dFast/dNormal = 0ms）
- [ ] 既存の keyboard / click 操作に干渉しない
- [ ] `pnpm verify` 全通過

## 注意事項

- Svelte `transition:` / `in:` / `out:` はコンポーネントがマウント/アンマウントされるタイミングで発火する
- `{#if open}` 内の要素に直接付与するため、`open` が true→false に切り替わると同時に out アニメーションが走る
- `cubicOut` は `svelte/easing` からインポート（`--ag-ease-out` の cubic-bezier 0,0,0.2,1 相当）
- floating モードでは `mode === 'inline'` ブランチが非表示なので backdrop には影響しない
