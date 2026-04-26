---
id: PH-20260426-350
status: todo
batch: 79
type: 改善
---

# PH-350: Widget Registry 単一情報源化（追加箇所 9 → 3 削減）

## 横展開チェック実施済か

- 本日のウィジェット追加 5 回（DailyTask / Snippet / Clipboard / FileSearch / SystemMonitor）の実測で「9 ファイル touch / 300〜400 行」と判明
- batch-72 で Sidebar palette への登録漏れが発生、batch-75 で WIDGET_LABELS 単一情報源化済 → 同思想を全 widget metadata に拡張

## 仕様

- `src/lib/widgets/widget-registry.ts` に全ウィジェットの metadata を集約:

  ```typescript
  export const WIDGETS: Record<WidgetType, WidgetMeta> = {
    favorites: {
      Component: FavoritesWidget,
      icon: Star,
      label: 'よく使うもの',
      defaultConfig: { max_items: 10 },
      addable: true,
    },
    // ... 14 entry
  };
  ```

- `WIDGET_LABELS` を `widget-registry.ts` から自動 export（後方互換）
- `WorkspaceLayout.widgetComponents`, `WorkspaceSidebar.availableWidgets` を registry から派生
- `Record<WidgetType, WidgetMeta>` 型強制で漏れ compile-time fail

## 受け入れ条件

- [ ] widget-registry.ts に 14 entry 集約
- [ ] WorkspaceLayout / WorkspaceSidebar が registry から派生
- [ ] 既存 hardcoded import / map を削除
- [ ] svelte-check で型漏れ 0
- [ ] `pnpm verify` 全通過
