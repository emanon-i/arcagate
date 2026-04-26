---
id: PH-20260427-395
status: todo
batch: 88
type: 改善
era: Polish Era
---

# PH-395: Settings/utils 配置整理（PH-376/391 deferred chain 専用バッチ）

## 参照した規約

- batch-83 PH-372 → batch-84 PH-376 → batch-87 PH-391 → 本バッチで消化
- 1 PR = 1 構造的テーマ原則のため専用バッチに切り出し
- folder-map.md 混乱箇所 top 10 #5, #6

## 横展開チェック実施済か

- batch-87 で AboutSection.svelte / EmptyState.svelte 等が新設、Settings/library/widgets 配置原則の確立タイミング
- 約 30 ファイル変更見込み（移動 + 参照更新 + SettingsPanel 分割）

## 仕様

### Settings の配置整理

- `src/lib/components/settings/LibraryCardSettings.svelte` → `src/lib/components/arcagate/library/LibrarySettings.svelte`
- 全参照箇所（SettingsPanel.svelte の library tab）を更新

### Tip + WidgetShell の再配置

- `src/lib/components/arcagate/common/Tip.svelte` → `src/lib/components/common/Tip.svelte`
- `src/lib/components/arcagate/common/WidgetShell.svelte` → `src/lib/widgets/_shared/WidgetShell.svelte`
- `arcagate/common/` 削除

### utils/ の domain 整理

- `src/lib/utils/format-meta.ts` → `src/lib/items/format.ts`
- `src/lib/utils/clipboard-history.ts` → `src/lib/widgets/clipboard-history/dedupe.ts`
- `src/lib/utils/history-buffer.ts` → `src/lib/widgets/system-monitor/sparkline.ts`

### SettingsPanel.svelte カテゴリ別分割

- 約 500 行 → カテゴリ別 component に分割: `general/GeneralSection.svelte` / `workspace/WorkspaceSection.svelte` / `library/LibrarySection.svelte` / `appearance/AppearanceSection.svelte` / `sound/SoundSection.svelte` / `data/DataSection.svelte`（AboutSection は既存）
- SettingsPanel.svelte は tablist + dynamic mount のシェル

## 受け入れ条件

- [ ] LibraryCardSettings → LibrarySettings 移動 + 参照更新
- [ ] format-meta.ts / clipboard-history.ts / history-buffer.ts の domain 配置
- [ ] SettingsPanel が 200 行以下
- [ ] 既存 e2e 全 pass
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **S**tructure: フォルダ整理
- **I**nterface: import パス整合
