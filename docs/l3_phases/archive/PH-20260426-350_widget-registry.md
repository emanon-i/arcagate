---
id: PH-20260426-350
status: deferred
batch: 79
type: 改善
note: Refactor Era 起動時に実施（user 判断、現状は polish 優先）
---

# PH-350: TS folder-per-widget colocation + auto-collect registry

## 横展開チェック実施済か

- 本日のウィジェット追加 5 回（DailyTask / Snippet / Clipboard / FileSearch / SystemMonitor）の実測で「9 ファイル touch / 300〜400 行」と判明
- batch-72 で Sidebar palette 登録漏れ発生、batch-75 で WIDGET_LABELS 単一情報源化済 → 同思想を全 widget metadata に拡張

## 仕様

### フォルダ構造（colocation）

```
src/lib/widgets/
├── index.ts                    # import.meta.glob で auto-collect、widgetRegistry export
├── _shared/                    # 共通型 / 共通 Shell（後続 PH-351 で活用）
├── clock/
│   ├── index.ts                # widgetType + meta export
│   ├── ClockWidget.svelte      # 本体
│   ├── ClockSettings.svelte    # 設定 UI（PH-351）
│   └── types.ts                # config interface（必要なら）
├── quick-note/...
├── exe-folder/...
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
└── watched-folders/...
```

### `widgets/<name>/index.ts` 形式

```typescript
import Component from './ClockWidget.svelte';
import SettingsContent from './ClockSettings.svelte';
import { Clock } from '@lucide/svelte';

export const widgetType = 'clock' as const;
export const meta = {
	Component,
	SettingsContent,
	icon: Clock,
	label: '時計',
	defaultConfig: { show_seconds: true, show_date: true },
	addable: true,
};
```

### `widgets/index.ts`

```typescript
const modules = import.meta.glob<{ widgetType: WidgetType; meta: WidgetMeta }>(
	'./*/index.ts',
	{ eager: true },
);
export const widgetRegistry = Object.fromEntries(
	Object.values(modules).map((m) => [m.widgetType, m.meta]),
) as Record<WidgetType, WidgetMeta>;
```

### 既存ファイル統合

- 既存 `src/lib/components/arcagate/workspace/<X>Widget.svelte` を `src/lib/widgets/<name>/<X>Widget.svelte` に移動
- `WorkspaceLayout.widgetComponents` map / `WorkspaceSidebar.widgetIcons` map / `WIDGET_LABELS` を **削除**、widgetRegistry 参照に置換

## 受け入れ条件

- [ ] 14 widget が `src/lib/widgets/<name>/` 配下に colocation
- [ ] `widgetRegistry` が 14 entry 完全網羅
- [ ] 既存 hardcoded import / map / WIDGET_LABELS 削除
- [ ] `Record<WidgetType, WidgetMeta>` 型強制で漏れ compile-time fail
- [ ] `pnpm verify` 全通過
