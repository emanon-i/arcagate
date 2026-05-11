# A1 Frontend Audit (`src/lib/`)

調査時点: 2026-05-06、main 最新 `f035a40` (PR #338 merge 後)。

## 1. `src/lib/` 全体地図

| subdir        | 内容                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `assets/`     | 画像・メディア (詳細未調査)                                                                                                     |
| `bindings/`   | Tauri 自動生成 bindings (1 file、ts-rs 由来)                                                                                    |
| `components/` | 96 .svelte (UI: ui/ + arcagate/ + settings/ + item/ + setup/ + help/ + common/)                                                 |
| `constants/`  | `item-type.ts` (type label / icon map)                                                                                          |
| `ipc/`        | 9 wrapper file (config / items / workspace / theme / export / launch / opener / onboarding / watched_paths) — `invoke()` を集約 |
| `state/`      | 15 store file (Svelte 5 runes)                                                                                                  |
| `styles/`     | `arcagate-theme.css` + test                                                                                                     |
| `types/`      | 11 type definition file                                                                                                         |
| `utils/`      | 37 utility (pure function + 一部 side effect)                                                                                   |
| `widgets/`    | 13 widget subdir + `_shared/` (CommonMaxItemsSettings, FolderPickerField)                                                       |

## 2. state stores 責務 audit

| File (`src/lib/state/`)       | LOC | export                  | 役割                                                                           |
| ----------------------------- | --: | ----------------------- | ------------------------------------------------------------------------------ |
| `workspace.svelte.ts`         | 666 | `workspaceStore`        | widget 配置・CRUD・overlap 判定・undo/redo・grid 計算 (config + behavior 混在) |
| `config.svelte.ts`            | 243 | `configStore`           | UI 設定 (card style/bg/sort/size)、localStorage + IPC                          |
| `palette.svelte.ts`           | 237 | `paletteStore`          | color palette (active/schemes/edit)、JSON export/import                        |
| `theme.svelte.ts`             | 222 | `themeStore`            | dark/light/custom theme、`listen('@theme-changed')`                            |
| `widget-zoom.svelte.ts`       | 195 | `useWidgetZoom`         | widget zoom (level/bounds)、function 形式                                      |
| `items.svelte.ts`             | 194 | `itemStore`             | items CRUD、tags、library stats、tag counts                                    |
| `workspace-history.svelte.ts` | 140 | `workspaceHistory`      | undo/redo stack (workspace mutation のみ)                                      |
| `library-history.svelte.ts`   | 113 | `libraryHistory`        | item create/update history (list 表示用)                                       |
| `metadata.svelte.ts`          |  87 | `metadataStore`         | item metadata cache (TTL 60s)、batch load + per-card sync read                 |
| `updater.svelte.ts`           |  87 | `startUpdaterAutoCheck` | app updater check loop                                                         |
| `error-monitor.svelte.ts`     |  94 | `installErrorMonitor`   | global error handler install/uninstall                                         |
| `error-monitor` 系 etc.       |   — | 残り                    | toast / help / hidden / pointer-drag                                           |

### 重複・責務混在の疑い

- **itemStore vs metadataStore**: 役割は分離されているが、`itemStore` の mutation 系で `metadataStore` cache invalidation が暗黙依存。明示的 invoke なし。
- **configStore vs themeStore**: configStore = UI color scheme (background / stroke 等)、themeStore = dark/light/custom。両者が localStorage / IPC を別々に管理。境界曖昧。
- **workspaceStore vs workspace-history**: workspaceStore = mutation 実行、history = snapshot 保持。役割は分離。

### IPC 呼び出し分布

- 全 invoke は `src/lib/ipc/*.ts` 9 file に集約
- store から invoke 直叩きは無し (`itemsIpc.listItems()` 形式 wrapper 経由)
- IPC import を持つ store: `itemStore`, `configStore`, `themeStore`, `updater`, `workspaceStore`

## 3. components/ 構成

### subdirectory 境界

- `ui/` — shadcn-svelte 由来 (button, dialog, dropdown 等) — **手動編集禁止** (CLAUDE.md `<critical-rule id="forbidden">`)
- `arcagate/` — domain UI (workspace / library / palette / common)
- `common/` — 汎用 (ActionButton, Chip, DetailRow, IndustrialButton/Panel, ItemIcon ほか 7 file)
- `settings/` (11)、`item/` (3)、`help/` (1)、`setup/` (5)

### 肥大化 file (LOC > 300)

| file                                         | LOC | 主な責務                                        |
| -------------------------------------------- | --: | ----------------------------------------------- |
| `arcagate/workspace/WorkspaceLayout.svelte`  | 666 | widget grid render + drag/resize + context menu |
| `arcagate/library/LibraryMainArea.svelte`    | 595 | library view + search + sort + detail pane      |
| `settings/SettingsPanel.svelte`              | 464 | UI 設定パネル全カテゴリ                         |
| `arcagate/library/LibraryDetailPanel.svelte` | 371 | item detail + metadata 表示                     |
| `item/ItemForm.svelte`                       | 347 | item create/edit form                           |
| `settings/ThemeEditor.svelte`                | 332 | theme editor UI                                 |

### 命名規則

- file 名: 全 component が PascalCase で統一 (混在なし)
- kebab-case の混在は無い (component 系は全 PascalCase)

## 4. utils/ 整理

37 file (test 込み)、pure function 中心。代表例:

| file                   | LOC | 種別                               |
| ---------------------- | --: | ---------------------------------- |
| `zoom-math.ts`         | 232 | pure (widget zoom anchor 計算)     |
| `resize-delta.ts`      | 119 | pure (drag → size delta)           |
| `widget-grid.ts`       | 117 | pure (overlap / free position)     |
| `grid-keyboard.ts`     | 110 | pure (arrow key navigation)        |
| `local-storage.ts`     | 110 | side effect (localStorage wrapper) |
| `format-meta.ts`       |  93 | pure (bytes/date format)           |
| `fuzzy-search.ts`      |  74 | pure                               |
| `library-sort.ts`      |  63 | pure (sort field/order validation) |
| `ipc-error.ts`         |  50 | pure (IPC error parsing)           |
| `tag-suggest.ts`       |  42 | pure                               |
| `clipboard-history.ts` |  33 | side effect (clipboard buffer)     |

domain logic 混入: 検出されず。

## 5. widgets/

13 widget subdirectory + `_shared/` (2 common component):
clipboard-history / daily-task / exe-folder / favorites / file-search / item / projects / quick-note / recent / snippet / stats / system-monitor

各 widget directory は `XxxWidget.svelte` + `XxxSettings.svelte` で構成。registry は `src/lib/widgets/index.ts`。

## 6. bindings/

ts-rs 自動生成、1 file。手動編集対象外。

## 7. 死コード sniff

| marker                              | count |
| ----------------------------------- | ----: |
| `// TODO`                           |     0 |
| `// FIXME`                          |     0 |
| `// HACK`                           |     0 |
| `deprecated` / `legacy` / `removed` |    14 |

`legacy` marker の集中先: ItemContextMenu (default opener)、ItemSettings / ItemWidget (item_ids vs item_id 後方互換)、widget-configs、SystemMonitorWidget (chart_type fallback)、registry.test。

## 8. 命名・import 規則

- file 名 case: PascalCase (component) / kebab-case (.ts) で **統一、混在なし**
- import path: `$lib/` alias で統一 (3,224 ref)、相対 path は widget `_shared` 内のみ (12 ref)

## まとめ

frontend の表層的な命名・構造は良好。重い課題は:

- **store: workspace.svelte.ts の責務分割** (config / mutation / history で 666 LOC)
- **component: 肥大 6 file の分割** (合計 ~2,800 LOC)
- **store: itemStore → metadataStore cache invalidation の明示化**
- **legacy item_id 互換コードの cleanup** (14 ref)

詳細は `a1-violations.md` の優先度表を参照。
