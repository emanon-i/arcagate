---
id: PH-20260426-370
status: done
batch: 83
type: 改善
era: Refactor Era / 構造フェーズ
---

# PH-370: widget folder-per-widget colocation（PH-350 deferred 着手）

## 横展開チェック実施済か

- batch-82 計測で確定された筆頭ホットスポット
- batch-79 PH-350 で deferred 状態、Refactor Era で着手と決定済（user 承認）
- batch-79 で導入済の widget-add-checklist.md 通り、移動後は touch ファイル数 9 → 2 に削減

## 仕様

### フォルダ構造

```
src/lib/widgets/
├── _shared/
│   ├── types.ts                # WidgetMeta interface
│   └── WidgetShell.svelte      # 既存 components/arcagate/common/ から移動
├── index.ts                    # import.meta.glob で auto-collect → widgetRegistry
├── clock/{ClockWidget.svelte, index.ts}
├── exe-folder/{ExeFolderWatchWidget.svelte, index.ts}
├── daily-task/...
├── snippet/...
├── clipboard-history/...
├── file-search/...
├── system-monitor/...
├── favorites/...
├── recent/...
├── projects/...
├── stats/...
├── item/...
├── quick-note/...
└── watched-folders/...
```

### 各 `widgets/<name>/index.ts`

```typescript
import Component from './ClockWidget.svelte';
import { Clock } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';

export const widgetType = 'clock' as const;
export const meta: WidgetMeta = {
  Component,
  icon: Clock,
  label: '時計',
  defaultConfig: { show_seconds: true, show_date: true },
  addable: true,
};
```

### `widgets/index.ts`

```typescript
import type { WidgetType } from '$lib/bindings/WidgetType';
import type { WidgetMeta } from './_shared/types';

const modules = import.meta.glob<{ widgetType: WidgetType; meta: WidgetMeta }>(
  './*/index.ts',
  { eager: true },
);

export const widgetRegistry = Object.fromEntries(
  Object.values(modules).map((m) => [m.widgetType, m.meta]),
) as Record<WidgetType, WidgetMeta>;
```

### 既存コードの更新

- `WorkspaceLayout.widgetComponents` map → `widgetRegistry` 経由
- `WorkspaceSidebar.availableWidgets` → `widgetRegistry` 経由
- `WIDGET_LABELS` → registry の label を export wrapper

### 移動対象（14 widget）

`src/lib/components/arcagate/workspace/<X>Widget.svelte` を `src/lib/widgets/<name>/<X>Widget.svelte` に移動。

## 受け入れ条件

- [ ] 14 widget 移動完了
- [ ] `widgetRegistry` 型 `Record<WidgetType, WidgetMeta>` で完全網羅
- [ ] 既存 hardcoded import / map 削除
- [ ] svelte-check 0 errors
- [ ] 既存 e2e 全 pass（リグレッション 0）
- [ ] `pnpm verify` 全通過
