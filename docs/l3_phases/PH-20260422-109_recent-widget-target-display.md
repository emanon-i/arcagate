---
id: PH-20260422-109
title: RecentLaunchesWidget の target 短縮表示
status: todo
batch: 24
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte
  - src/lib/utils/format-target.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`RecentLaunchesWidget` の各行右端に `item.target` をそのまま表示している。
`C:\Users\gonda\AppData\Roaming\...` のようなフルパスや `https://very-long-domain.example.com/path/to/page` が
truncate されても視覚的に醜く、情報量も少ない。

現状:

```svelte
<span class="shrink-0 max-w-[40%] truncate text-xs text-[var(--ag-text-muted)]">{item.target}</span>
```

## 実装内容

### `src/lib/utils/format-target.ts` (新規)

```typescript
export function formatTarget(target: string): string {
  // URL の場合はホスト名のみ
  try {
    const url = new URL(target);
    return url.hostname;
  } catch {
    // ファイルパスの場合は最後のセグメント（ファイル名）のみ
    const seg = target.replace(/\\/g, '/').split('/').filter(Boolean);
    return seg[seg.length - 1] ?? target;
  }
}
```

### `RecentLaunchesWidget.svelte` の変更

```svelte
import { formatTarget } from '$lib/utils/format-target';
...
<span class="...">{formatTarget(item.target)}</span>
```

## 注意事項

- `formatTarget` は純粋関数なのでユニットテスト対象にする
- `item.target` が空文字の場合も考慮（空文字をそのまま返す）

## 受け入れ条件

- [ ] `src/lib/utils/format-target.ts` が新規作成されていること
- [ ] `RecentLaunchesWidget.svelte` が `formatTarget` を使っていること
- [ ] `formatTarget` のユニットテストが追加されていること（vitest）
- [ ] biome / svelte-check 0 errors
