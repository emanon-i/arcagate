---
id: PH-20260425-269
status: todo
batch: 62
type: 整理
---

# PH-269: Widget Config 型整備

## 背景・目的

batch-61 で `WidgetSettingsDialog.svelte` に `sort_field` を追加したが、
widget.config の型は `parseWidgetConfig` に渡すアドホックなオブジェクトで管理されている。
batch-62 で Clock/Stats/QuickNote が加わると config キーが増え、型安全性が低下する。
専用の型定義ファイルで各ウィジェットの config 型を一元管理する。

## 現状の問題

- `parseWidgetConfig(widget?.config, { sort_field: 'default' as WidgetSortField })` がコード散在
- `widget-list.ts` に `WidgetSortField` / `WidgetListConfig` があるが、他ウィジェット用の型がない
- Clock の `show_seconds: boolean` や QuickNote の `note: string` が型なしで使われる予定

## 設計

`src/lib/types/widget-configs.ts` に各ウィジェットの config 型を集約:

```typescript
// 各ウィジェットの config デフォルト値と型を定義
export interface ListWidgetConfig {
  max_items: number;
  sort_field: 'default' | 'name';
}
export interface ClockWidgetConfig {
  show_seconds: boolean;
  show_date: boolean;
  show_weekday: boolean;
  use_24h: boolean;
}
export interface QuickNoteConfig {
  note: string;
}
export interface ItemWidgetConfig {
  item_id: string | null;
}
```

各ウィジェット側では `parseWidgetConfig(widget?.config, DEFAULT_LIST_CONFIG)` のように
定数から import して使う。

## 実装ファイル

| ファイル                                                 | 変更内容                                        |
| -------------------------------------------------------- | ----------------------------------------------- |
| `src/lib/types/widget-configs.ts`                        | 新規: 各ウィジェット config 型 + デフォルト定数 |
| `src/lib/types/widget-list.ts`                           | `WidgetListConfig` を widget-configs に移管     |
| `FavoritesWidget.svelte` / `RecentLaunchesWidget.svelte` | import 先変更                                   |
| `ItemWidget.svelte`                                      | `ItemWidgetConfig` 型を使用                     |

## 受け入れ条件

- [ ] `widget-configs.ts` に全ウィジェット config 型が定義される
- [ ] 既存ウィジェットが新型定義を使うよう更新される
- [ ] `svelte-check` / `biome` エラーなし
- [ ] `pnpm verify` 全通過
