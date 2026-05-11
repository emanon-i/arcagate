# A2 Svelte 5 + Runes Best Practices

調査時点: 2026-05-06。引用元 URL は各 section 末尾。

## 1. Runes の基本則

### 1.1 `$state` / `$derived` / `$effect` の役割分担

| rune                   | 役割                                  | 戻り値        |
| ---------------------- | ------------------------------------- | ------------- |
| `$state(initial)`      | reactive state を作る                 | 値 (or proxy) |
| `$derived(expr)`       | state から **pure** に compute する   | 値            |
| `$effect(() => {...})` | state 変化時に **side effect** を発火 | なし          |

「The single most common mistake with runes is reaching for $effect when a $derived would do. $derived is for computing values based on state (pure, returns a value) while $effect is for running side effects when state changes (impure, no return value).」 ([Mainmatter: Runes and Global state](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/))

### 1.2 ファイル境界で同じ動作

- `.svelte` / `.svelte.ts` / class field のどこでも runes は **同じ振る舞い**
- 「dependency tracking is runtime now (signals under the hood), so extracting logic into functions doesn't break anything」 ([Svelte 公式 blog: Introducing runes](https://svelte.dev/blog/runes))

### 1.3 stores は deprecated **ではない**

- legacy `writable` / `readable` / `derived` は維持して OK
- bottom-up migration: 子から runes 化、root を最後に

## 2. `.svelte.ts` で global state を export する pattern

### 2.1 ❌ 直接 export は **frozen**

```ts
// ❌ frozen pattern
let count = $state(0);
export { count };
```

import 時に値が **固定**される。`count++` しても他 module には伝播しない。

### 2.2 ✓ Object getter/setter

```ts
let count = $state(0);
export const counter = {
  get value() { return count; },
  set value(v) { count = v; }
};
```

### 2.3 ✓ Closure (function 経由)

```ts
let count = $state(0);
export function get() { return count; }
export function set(v) { count = v; }
```

### 2.4 ✓ Object proxy (一番簡潔)

```ts
export const counter = $state({ value: 0 });
```

import 側は `counter.value` で読み書き、reactivity 維持。

### 2.5 ✓ Class wrapper (パフォーマンス重視 + メソッド集約)

```ts
class Counter {
  value = $state(0);
  increment() { this.value++; }
  reset() { this.value = 0; }
}
export const counter = new Counter();
```

「クラスはPOJOより高速。V8エンジンが最適化」。複数 property + 複数 method なら class、単純 counter なら closure / proxy。

出典: [Mainmatter: Runes and Global state](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/)

## 3. Component 跨ぎの state 共有

### 3.1 推奨: Context + 型安全ラッパー

```ts
// lib/notification-context.ts
import { getContext, setContext } from "svelte";
const KEY = Symbol();

export function set_notifications(notifications: string[]) {
  return setContext(KEY, notifications);
}

export function get_notifications() {
  return getContext<string[]>(KEY);
}
```

```svelte
<!-- root layout -->
<script>
  const notifications = $state<string[]>([]);
  set_notifications(notifications);
</script>
{@render children()}
```

```svelte
<!-- child -->
<script>
  const notifications = get_notifications();
</script>
<button onclick={() => notifications.push("New!")}>...</button>
```

### 3.2 module-level global state の落とし穴 (SSR)

「グローバルstateはサーバー・クライアント両環境に存在。非同期処理でクロスリクエスト汚染の危険」

```ts
// ❌ 危険: 並行リクエストで上書き
let user = $state(null);
export async function fetchUser(id) {
  user = await fetch(`/api/users/${id}`);
}
```

複数 request が並行実行時、Request A の完了前に Request B が user を上書き → 別 user 情報が読まれる。

### 3.3 Arcagate での適用

- **desktop app (SSR なし)** なので 3.2 のクロスリクエスト汚染は **発生しない**
- ただし test 容易性 / mock 注入のためには **Context pattern が依然有用**
- A3 で「user 跨ぎ状態」「workspace 跨ぎ状態」を Context per slice で再設計するか検討

出典: [Mainmatter article](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/)

## 4. Test 容易性

### 4.1 Class instance per test

```ts
import { Counter } from './counter.svelte.ts';
test('increment', () => {
  const c = new Counter();
  c.increment();
  expect(c.value).toBe(1);
});
```

singleton (`export const counter = new Counter()`) の代わりに、test 側で **fresh instance** を作る。

### 4.2 Context-based mock 注入

setup phase で context に mock を inject、production では real impl を inject。

## 5. $derived と $effect の使い分け

### 5.1 $derived ✓ pure compute

```ts
let count = $state(0);
let doubled = $derived(count * 2);  // ✓ value
```

### 5.2 $effect ✓ side effect (DOM、API call、log)

```ts
$effect(() => {
  document.title = `Count: ${count}`;  // DOM 副作用
});
```

### 5.3 ❌ よくある誤用

```ts
// ❌ $derived で済む
let doubled = $state(0);
$effect(() => { doubled = count * 2; });  // ← anti-pattern

// ✓ 正解
let doubled = $derived(count * 2);
```

## 6. Arcagate 現状 (A1 finding) との対応

具体的 migration 手順は A3 で確定。ここでは Svelte 5 best practice 観点での方向性のみ記す。

- **V4 workspace.svelte.ts (666 LOC) split**: 単一 module で多数の `$state` export は frozen / 責務肥大の risk。`workspace-config` / `workspace-widgets` / (既存) `workspace-history` の 3 class wrapper に分割し、`new XxxStore()` で test 容易性を担保。計算 logic は `utils/widget-grid.ts` に集約。
- **V6 itemStore → metadataStore invalidation**: `$effect` で暗黙的に invalidate せず、itemStore mutation method 内で `metadataStore.invalidate(id)` を **明示 invoke**。$effect は anti-pattern (trace 困難、意味的 side effect でも明示の方が読める)。
- **V8 configStore vs themeStore 境界**: state slice 毎に class wrapper を切り、module 単位で責務を明示 (config = UI 設定、theme = 配色のみ)。Context 化は SSR なしの desktop app では必須でないが、test 容易性のため検討余地。

## 主要 source link

- [Svelte 公式 blog: Introducing runes](https://svelte.dev/blog/runes)
- [Svelte 公式 docs: $effect](https://svelte.dev/docs/svelte/$effect)
- [Mainmatter: Runes and Global state](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/)
- [Svelte 5 Patterns: Simple Shared State, getContext, Tweened Stores with $runes](https://fubits.dev/notes/svelte-5-patterns-simple-shared-state-getcontext-tweened-stores-with-runes/)
- [Note to Myself: Non-Obvious Details About Svelte 5 Runes](https://github.com/sveltejs/svelte/discussions/14835)
