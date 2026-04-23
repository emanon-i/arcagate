---
status: todo
phase_id: PH-20260423-158
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceHintBar.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-158 WorkspaceHintBar 入場アニメーション

## 背景・目的

`WorkspaceHintBar.svelte` は `{#if editMode}` による瞬時表示のみで、編集モード ON/OFF 時のアニメーションがない。
編集モードに入ると画面下部にヒントバーが「ぽっ」と出現するが、アニメーションがないと唐突に感じる。

fly up（下から上へスライド） + fade で登場させ、消去時も fade で消えるようにする。

## 実装仕様

### `<script>` 追加

```typescript
import { fade, fly } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

const rm = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;
```

### テンプレート変更

ヒントバーの最外 `<div>` に transition を追加:

**Before:**

```svelte
{#if editMode}
  <div class="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
```

**After:**

```svelte
{#if editMode}
  <div
    class="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2"
    in:fly={{ y: 8, duration: dNormal, easing: cubicOut }}
    out:fade={{ duration: dFast }}
  >
```

`y: 8` は 8px 下から上へ浮き上がる演出。`bottom-3` の絶対配置なので負方向（下→上）は正の y 値。

## 受け入れ条件

- [ ] 編集モード ON 時: ヒントバーが下から浮き上がり 200ms で表示
- [ ] 編集モード OFF 時: ヒントバーが 120ms でフェードアウト
- [ ] `prefers-reduced-motion: reduce` 環境でアニメーションなし
- [ ] 既存の `pointer-events-none` / `z-20` 挙動に影響なし
- [ ] `pnpm verify` 全通過

## 注意事項

- ヒントバーは `bottom-3` で位置固定なので `y: 8` はコンテナの bottom からの相対ではなく fly の開始オフセット。`in:fly={{ y: 8 }}` だと 8px 下から登場する（正常）
- `translate-x-1/2` との干渉はなし（fly は translateY を追加するだけで translateX は変更しない）
