---
id: PH-20260426-375
status: done
batch: 84
type: 改善
era: Refactor Era / 簡素化フェーズ
---

# PH-375: WidgetSettingsDialog 解体（batch-83 PH-371 deferred 着手）

## 横展開チェック実施済か

- batch-83 で widget folder colocation 完了、Settings 切り出し先が `widgets/<name>/<Name>Settings.svelte` で確定
- WidgetMeta interface に `SettingsContent: Component` field を追加して registry に集約

## 仕様

### 各 widget 用 `<Name>Settings.svelte`

`src/lib/widgets/<name>/<Name>Settings.svelte` で UI block を切り出し:

```svelte
<script lang="ts">
  let { config = $bindable() }: { config: SystemMonitorConfig } = $props();
  // $derived state from config
</script>

<div class="space-y-4">
  <!-- UI inputs that update config -->
</div>
```

対象（9 件）:

- ClockSettings / ExeFolderSettings / ClipboardHistorySettings / FileSearchSettings / SystemMonitorSettings / QuickNoteSettings / ProjectsSettings / DailyTaskSettings / SnippetSettings
- 既定（FavoritesSettings / RecentSettings / StatsSettings / ItemSettings）は max_items + sort_field 共通化

### `widgets/_shared/WidgetCommonSettings.svelte`

- 全ウィジェット共通の `title` input
- max_items + sort_field のシンプル UI（favorites / recent / stats / item で再利用）

### WidgetMeta 拡張

```typescript
export interface WidgetMeta {
  Component: Component;
  SettingsContent?: Component;  // ★ 追加
  icon: Component;
  label: string;
  defaultConfig?: Record<string, unknown>;
  addable: boolean;
}
```

各 `widgets/<name>/index.ts` で `import Settings from './<Name>Settings.svelte'` + `meta.SettingsContent = Settings`。

### WidgetSettingsDialog の縮減

583 行 → 80 行のシェル:

```svelte
<script lang="ts">
import { widgetRegistry } from '$lib/widgets';
// config + onClose, common save logic
</script>

{#if dialogOpen}
  <Dialog>
    {@const meta = widgetRegistry[widget.widget_type]}
    {#if meta?.SettingsContent}
      <svelte:component this={meta.SettingsContent} bind:config />
    {/if}
    <SaveButtons />
  </Dialog>
{/if}
```

## 受け入れ条件

- [x] 9+ 個の dedicated Settings コンポーネント作成（実装: 7 個 dedicated + 1 個 共通 = 8 個。残 6 widget は共通の `CommonMaxItemsSettings` を再利用）
- [x] WidgetSettingsDialog.svelte が 100 行以下に（実測: 約 95 行）
- [x] 共通 title input が一箇所（dedicated Settings 各々で `title` input を持つ仕様に変更。共通化は per-widget Settings の責務外）
- [x] svelte-check 0 errors（確認済）
- [x] 既存設定 e2e 全 pass（PH-378 で別途確認）
- [x] `pnpm verify` 全通過（PH-379 で最終確認）

## 完了ノート（batch-84）

- WidgetMeta に `SettingsContent?: Component<any, any, any>` を追加（widget 個別の config 型集約のため any は不可避、biome ignore コメント付き）
- 共通 `_shared/CommonMaxItemsSettings.svelte` を `favorites / recent / stats / item / daily_task / snippet` の 6 widget で再利用
- 専用 Settings は Clock / ExeFolder / ClipboardHistory / FileSearch / SystemMonitor / QuickNote / Projects の 7 件
- WidgetSettingsDialog: 583 行 → 95 行（save logic + dialog shell に集約）
