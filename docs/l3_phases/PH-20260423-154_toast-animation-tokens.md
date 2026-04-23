---
status: todo
phase_id: PH-20260423-154
scope_files:
  - src/lib/components/arcagate/common/ToastContainer.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-154 Toast アニメーション duration をトークン値に揃える

## 背景・目的

`ToastContainer.svelte` のトランジションがハードコード値を使用している:

```svelte
in:fly={{ x: 100, duration: 250 }}
out:fade={{ duration: 150 }}
```

ux_standards.md §2 の duration テーブルに合わせ、`--ag-duration-normal`（200ms）と `--ag-duration-fast`（120ms）相当の値に統一する。
また `prefers-reduced-motion: reduce` 環境で 0ms になるよう対応する。

Svelte `transition:` の `duration` は JS の数値で渡すため、CSS 変数を直接使えない。
`window.matchMedia` で reduced-motion を検出し、0 に切り替えるパターンを採用する。

## 実装仕様

### `<script>` 変更

**Before:**

```typescript
import { X } from '@lucide/svelte';
import { fade, fly } from 'svelte/transition';
import { toastStore } from '$lib/state/toast.svelte';
```

**After:**

```typescript
import { X } from '@lucide/svelte';
import { fade, fly } from 'svelte/transition';
import { toastStore } from '$lib/state/toast.svelte';

const rm = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
```

### テンプレート変更

**Before:**

```svelte
in:fly={{ x: 100, duration: 250 }}
out:fade={{ duration: 150 }}
```

**After:**

```svelte
in:fly={{ x: 100, duration: dNormal }}
out:fade={{ duration: dFast }}
```

## 受け入れ条件

- [ ] toast 表示時: 200ms で右からスライドイン
- [ ] toast 消去時: 120ms でフェードアウト
- [ ] `prefers-reduced-motion: reduce` 環境でアニメーションなし
- [ ] `pnpm verify` 全通過

## 注意事項

- `rm` は module 評価時（コンポーネント初期化時）に 1 回だけ評価される。セッション中に media query が変わることは実用上ないため問題なし
- toast は `z-50` の fixed 要素。他コンポーネントのアニメーションと干渉しない
