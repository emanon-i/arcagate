---
id: PH-20260427-391
status: todo
batch: 87
type: 改善
era: Polish Era
---

# PH-391: PH-376 deferred 消化（Settings/utils 配置整理）

## 参照した規約

- batch-83 PH-372 deferred → batch-84 PH-376 deferred → 本バッチで消化
- `docs/l2_architecture/folder-map.md` 混乱箇所 top 10 #5, #6
- batch-83 PH-370 で widgets/ colocation 達成済、library/ も同パターンで集約

## 横展開チェック実施済か

- batch-86 で AboutSection.svelte を新設、Settings 配下の整理が現実的に必要
- LibraryCardSettings は SettingsPanel から呼ばれているが、library 関連は arcagate/library/ に集約する原則を確立

## 仕様

### Settings の配置整理

- `src/lib/components/settings/LibraryCardSettings.svelte` → `src/lib/components/arcagate/library/LibrarySettings.svelte`
- 全参照箇所（SettingsPanel.svelte の library tab）を更新

### Tip + WidgetShell の再配置

- `src/lib/components/arcagate/common/Tip.svelte` → `src/lib/components/common/Tip.svelte` (横断汎用)
- `src/lib/components/arcagate/common/WidgetShell.svelte` → `src/lib/widgets/_shared/WidgetShell.svelte` (workspace 専用)
- `arcagate/common/` 削除（中身が空になる）

### utils/ の domain 整理

- `src/lib/utils/format-meta.ts` → `src/lib/items/format.ts` (item 専用)
- `src/lib/utils/clipboard-history.ts` → `src/lib/widgets/clipboard-history/dedupe.ts`
- `src/lib/utils/history-buffer.ts` → `src/lib/widgets/system-monitor/sparkline.ts`
- 残る utils は本当の汎用のみ（resize-delta / tag-suggest / per-card-override / widget-grid 等）

### SettingsPanel.svelte カテゴリ別分割

- 約 500 行 → カテゴリ別 component に分割: `general/GeneralSection.svelte` / `workspace/WorkspaceSection.svelte` / `library/LibrarySection.svelte` / `appearance/AppearanceSection.svelte` / `sound/SoundSection.svelte` / `data/DataSection.svelte`
- batch-86 で AboutSection.svelte は新設済 → 既存パターン
- SettingsPanel.svelte は tablist + dynamic mount のシェルに

## 受け入れ条件

- [ ] LibraryCardSettings → LibrarySettings 移動 + 参照更新
- [ ] format-meta.ts / clipboard-history.ts / history-buffer.ts の domain 配置
- [ ] SettingsPanel が 200 行以下
- [ ] 既存 e2e 全 pass
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **S**tructure: フォルダ配置の整理
- **I**nterface: import パスの整合性
