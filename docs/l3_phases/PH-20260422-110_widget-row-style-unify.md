---
id: PH-20260422-110
title: ウィジェット行スタイル統一（FavoritesWidget / RecentLaunchesWidget）
status: todo
batch: 24
priority: low
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/FavoritesWidget.svelte
  - src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

2 つのウィジェットで item row の Tailwind クラスが微妙に異なる。

| ウィジェット         | padding  | 角丸          |
| -------------------- | -------- | ------------- |
| FavoritesWidget      | `py-2.5` | `rounded-2xl` |
| RecentLaunchesWidget | `py-3`   | `rounded-2xl` |

同じ "行ボタン" UIなのに padding が違う。視覚的な一貫性のため `py-2.5` に統一する。

## 実装内容

`RecentLaunchesWidget.svelte` の item row button の `py-3` を `py-2.5` に変更。

```svelte
<!-- 変更前 -->
<button ... class="... px-3 py-3 ...">

<!-- 変更後 -->
<button ... class="... px-3 py-2.5 ...">
```

## 受け入れ条件

- [ ] `RecentLaunchesWidget.svelte` の item row が `py-2.5` になっていること
- [ ] biome / svelte-check 0 errors
