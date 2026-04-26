---
id: PH-20260426-372
status: todo
batch: 83
type: 改善
era: Refactor Era / 構造フェーズ
---

# PH-372: Settings 内コンポーネント + utils/ の配置整理

## 横展開チェック実施済か

- batch-82 folder-map.md の混乱箇所 top 10 のうち #5, #6 を消化
- PH-370 / 371 と一緒に進めることで widget 関連のリファクタを 1 PR に集約

## 仕様

### Settings の配置整理

- `src/lib/components/settings/LibraryCardSettings.svelte` → `src/lib/components/arcagate/library/LibrarySettings.svelte` に移動
- 全参照箇所（SettingsPanel.svelte の library tab 等）を更新
- 「Library 配下の UI は components/arcagate/library/ に集約」原則を確立

### Tip コンポーネントの配置検討

- `src/lib/components/arcagate/common/Tip.svelte` は横断汎用 → `src/lib/components/common/Tip.svelte` に移動候補
- `WidgetShell` は workspace 専用 → `src/lib/widgets/_shared/WidgetShell.svelte` に集約（PH-370 で実施）
- `arcagate/common/` は実質「workspace + common」だったので、整理後は `arcagate/common/` を削除候補

### utils/ の domain 整理

- `src/lib/utils/format-meta.ts` → `src/lib/items/format.ts` に移動（item 専用）
- `src/lib/utils/clipboard-history.ts` → `src/lib/widgets/clipboard-history/dedupe.ts` に移動（widget 内ロジック）
- `src/lib/utils/history-buffer.ts` → `src/lib/widgets/system-monitor/sparkline.ts` 又は `_shared/`
- 残る utils は本当の汎用のみ（resize-delta / tag-suggest / per-card-override 等）

### SettingsPanel.svelte カテゴリ別分割

- 455 行 → カテゴリ別 component に分割: GeneralSettings / WorkspaceSettings / LibrarySettings / AppearanceSettings / SoundSettings / DataSettings
- SettingsPanel.svelte は tablist + `<svelte:component this={categoryComponent}>` のシェルに

## 受け入れ条件

- [ ] LibraryCardSettings → LibrarySettings 移動 + 参照更新
- [ ] format-meta.ts / clipboard-history.ts / history-buffer.ts の domain 配置
- [ ] SettingsPanel が 200 行以下に縮む
- [ ] 既存 e2e 全 pass
- [ ] `pnpm verify` 全通過
