---
id: PH-20260426-351
status: todo
batch: 79
type: 改善
---

# PH-351: WidgetSettingsDialog 分割（雪だるま 9 ブランチ解体）

## 横展開チェック実施済か

- 現状 WidgetSettingsDialog.svelte は 500+ 行、9 種類のウィジェット用 if/else if + 各々 UI 50〜80 行
- 共通項目（title）が各ブランチに重複
- PH-350 で導入する WidgetMeta に SettingsContent コンポーネントを含める

## 仕様

- `src/lib/widgets/settings/<WidgetType>Settings.svelte` に各ウィジェット専用設定 UI を切り出し
  - 例: `ClipboardHistorySettings.svelte`, `SystemMonitorSettings.svelte`, ...
- 共通項目（title）は `WidgetCommonSettings.svelte` に集約
- `WidgetSettingsDialog` は `<svelte:component this={meta.SettingsContent}>` で動的 mount
- registry の WidgetMeta に `SettingsContent: Component` を追加

## 受け入れ条件

- [ ] 9 個の dedicated settings コンポーネント作成
- [ ] WidgetSettingsDialog.svelte が 200 行以下に縮む
- [ ] 共通項目（title）が一箇所
- [ ] `pnpm verify` 全通過
