---
id: PH-20260426-376
status: deferred
batch: 84
type: 改善
era: Refactor Era / 簡素化フェーズ
---

# PH-376: Settings 内コンポーネント + utils/ の配置整理（batch-83 PH-372 deferred 着手）

## 横展開チェック実施済か

- batch-82 folder-map.md の混乱箇所 top 10 #5, #6
- batch-83 で widget colocation 完了、次は library / settings / utils 整理

## 仕様

### Settings の配置整理

- `src/lib/components/settings/LibraryCardSettings.svelte` → `src/lib/components/arcagate/library/LibrarySettings.svelte`
- 全参照箇所（SettingsPanel.svelte の library tab 等）を更新

### Tip + WidgetShell の再配置

- `src/lib/components/arcagate/common/Tip.svelte` → `src/lib/components/common/Tip.svelte` (横断汎用)
- `src/lib/components/arcagate/common/WidgetShell.svelte` → `src/lib/widgets/_shared/WidgetShell.svelte` (workspace 専用)
- 整理後 `arcagate/common/` を削除

### utils/ の domain 整理

- `src/lib/utils/format-meta.ts` → `src/lib/items/format.ts` (item 専用)
- `src/lib/utils/clipboard-history.ts` → `src/lib/widgets/clipboard-history/dedupe.ts`
- `src/lib/utils/history-buffer.ts` → `src/lib/widgets/system-monitor/sparkline.ts`
- 残る utils は本当の汎用のみ（resize-delta / tag-suggest / per-card-override 等）

### SettingsPanel.svelte カテゴリ別分割

- 455 行 → カテゴリ別 component に分割: GeneralSettings / WorkspaceSettings / LibrarySettings / AppearanceSettings / SoundSettings / DataSettings
- SettingsPanel.svelte は tablist + `<svelte:component this={categoryComponent}>` のシェルに

## 受け入れ条件

- [ ] LibraryCardSettings → LibrarySettings 移動 + 参照更新
- [ ] format-meta.ts / clipboard-history.ts / history-buffer.ts の domain 配置
- [ ] SettingsPanel が 200 行以下
- [ ] 既存 e2e 全 pass
- [ ] `pnpm verify` 全通過

## deferred 判断（batch-84）

batch-84 では PH-375（WidgetSettingsDialog 解体）の差分が 23 ファイル / +692/-521 と大きく、
PH-376 を同 PR に詰めると全体で 50+ ファイル変更になりレビュー困難になる。

batch-83 で PH-371/372 を batch-84 に分離した判断（1 PR = 1 構造的テーマ）を継続し、
**PH-376 を batch-85 以降に持ち越す**。

batch-85 は性能フェーズの予定だが、PH-376 は性能と直交する整理タスクのため、
batch-86「整理フェーズ」または batch-85 の整理枠 1 plan として消化する。
