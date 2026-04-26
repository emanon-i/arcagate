---
id: PH-20260426-371
status: deferred
batch: 83
type: 改善
era: Refactor Era / 構造フェーズ
---

# PH-371: WidgetSettingsDialog 解体（PH-351 deferred 着手）

## 横展開チェック実施済か

- batch-82 計測で 583 行 / 9 ブランチ if/else if と確定済
- PH-370 の widget folder colocation と一緒に進めることで効率化

## 仕様

### 各 widget 用 Settings コンポーネント

`src/lib/widgets/<name>/<Name>Settings.svelte` に切り出し:

- ClipboardHistorySettings.svelte（max_items / poll_interval / title）
- ExeFolderSettings.svelte（watch_path / scan_depth / title）
- ClockSettings.svelte（show_seconds / show_date / show_weekday / use_24h）
- FileSearchSettings.svelte（root / depth / limit / title）
- SystemMonitorSettings.svelte（refresh_interval / show_cpu / show_memory / show_disk / title）
- QuickNoteSettings.svelte（font_size）
- ProjectsSettings.svelte（max_items / git_poll / title / description / watched_folder / auto_add）
- DailyTaskSettings.svelte（hideCompleted / title 等）
- SnippetSettings.svelte（snippets / title 等）
- 既定（FavoritesSettings / RecentSettings / StatsSettings 等、共通 max_items のみ）

### 共通項目

- `_shared/WidgetCommonSettings.svelte`: 全ウィジェット共通の `title` input
- registry の `meta.SettingsContent` に各 Settings コンポーネントを登録

### WidgetSettingsDialog の縮減

- 583 行 → ~80 行のシェルに
- `<svelte:component this={meta.SettingsContent} {widget} {onClose}>` で動的 mount

## 受け入れ条件

- [ ] 9+ 個の dedicated Settings コンポーネント作成
- [ ] WidgetSettingsDialog.svelte が 100 行以下に
- [ ] 共通 title input が一箇所
- [ ] svelte-check 0 errors
- [ ] 既存設定テスト全 pass
- [ ] `pnpm verify` 全通過
