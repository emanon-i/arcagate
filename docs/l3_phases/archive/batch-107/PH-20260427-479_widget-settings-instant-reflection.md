---
id: PH-20260427-479
title: Widget 設定の即時反映 fix (画面切り替え不要に)
status: done
batch: 107
pr: 184
merged_at: 2026-04-27T15:30:14Z
era: polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/state/workspace.svelte.ts
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte
  - src/lib/widgets/*/[A-Z]*.svelte
---

# PH-479: Widget 設定の即時反映 fix

## 背景

ユーザー dev fb (2026-04-27、最重要):

> あとウィジット編集から反映が遅い、画面切り替えしないと変わらないのが最悪。これはウィジットによらないすべてで起きている。

全 widget で「設定変更 → Apply → 画面切り替え (Workspace 切替 / Settings 開閉) しないと反映されない」状態。
Svelte 5 reactivity が widget render に正しく流れていない。

## 仮説

1. `workspace.svelte.ts:updateWidgetConfig` の `widgets = widgets.map(...)` で keyed `{#each}` の widget prop が同 reference 維持で、子 widget の `$derived(parseWidgetConfig(widget?.config, ...))` が再計算されない
2. WidgetSettingsDialog の `bind:config` で SettingsContent が in-place mutate するため、parent の `config` state は同 object reference (Svelte 5 で detect されない)
3. `parseWidgetConfig` の戻り値 object identity (毎回 `{...defaults, ...parsed}` で新 object なのでこれは OK)

## 修正

### 1. workspace store: 全 reload で確実 reactive 化

`updateWidgetConfig` 後に `await workspaceIpc.listWidgets(activeWorkspaceId)` で widgets 全配列を新 reference に置き換え。
これで keyed each の widget prop が新 object になり、子 derived が確実再計算。

### 2. WidgetSettingsDialog: bind: 廃止 + Apply で明示 commit

旧:

```svelte
<SettingsContent bind:config />
```

新: SettingsContent 側は `let { config } = $props()` + `let local = $state({...config})` で local copy、
親には `oncommit` callback で渡す。または bind: のままで `config = { ...config }` 強制再代入で reference 切替。

簡易 MVP: bind: は維持しつつ、handleSave 内で config snapshot → updateWidgetConfig (Rust → 全 reload で UI 再描画)。

## 受け入れ条件

- [x] `workspace.svelte.ts:updateWidgetConfig`: loadWidgets 全 reload を IPC 後に呼ぶ
- [x] PH-477 history record と整合 (loadWidgets 後でも history は session memory なので影響なし)
- [ ] E2E: 「Settings 変更 → Apply → 同 Workspace で widget 表示が即時更新」を assert (画面切替なし)
- [ ] 全 widget 動作確認 (Clock, Item, FileSearch, ExeFolder, ClipboardHistory, DailyTask, QuickNote, Stats, Favorites, Recent, Projects, etc.)

## 横展開

- [x] WidgetSettingsDialog の `$effect(() => widget.config)` は依存追跡済、再 fire される
- [x] ItemWidget 等の `let config = $derived(parseWidgetConfig(widget?.config, ...))` は widget prop 更新で再計算

## SFDIPOT

- **F**unction: 設定保存 → widget 即時更新 (画面切替不要)
- **D**ata: widget config JSON、Rust side 更新後 listWidgets で全件再取得
- **T**ime: 知覚可能 (< 200ms)、IPC 1 回 + reload 1 回

## HICCUPPS

- [User] 「画面切り替えしないと変わらないのが最悪」を消去
- [Comparable] Notion / Figma の設定変更は即時反映が標準

## 規約参照

- engineering-principles §2 (UI 応答 < 100ms 目標)
- lessons.md「Svelte 5 $effect の依存追跡」

## 参考

- workspace.svelte.ts:updateWidgetConfig
- WidgetSettingsDialog.svelte:handleSave
