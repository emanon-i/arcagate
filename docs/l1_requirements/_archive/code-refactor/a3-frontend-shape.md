# A3 Frontend Target Shape (`src/lib/`)

A1 audit + A2 best practice (Svelte 5 SV-1..4) を踏まえた、refactor 完了後の frontend target shape。store 責務分割 (V4) / component 肥大解消 (V5) / cache invalidation 明示化 (V6) / store 境界整理 (V8) / legacy 削除 (V9) を扱う。

## 1. Subdir 構造 (現状維持 + 微調整)

```
src/lib/
├── assets/
├── bindings/         (ts-rs 自動生成、現状 1 file 維持)
├── components/       (96 .svelte、肥大 6 file を split)
│   ├── arcagate/    (workspace / library / palette / common)
│   ├── settings/    (sub panel に分割: theme / sound / hotkey / opener)
│   ├── item/        (form を 3 segment に分割)
│   ├── help/, setup/
│   └── ui/          (shadcn-svelte 由来、手動編集禁止 — 維持)
├── constants/        (item-type.ts、現状維持)
├── ipc/              (9 wrapper file、invoke 集約 — 現状維持)
├── state/            (15 store、target 18-20 store に分割)
├── styles/           (現状維持)
├── types/            (11 file、現状維持)
├── utils/            (37 file、widget-grid.ts に計算 logic を集約)
└── widgets/          (13 widget + _shared、現状維持)
```

**変更点**:

- `state/` で sub-store 増加 (workspace の 666 LOC を 3 sub-store に分割、V4)
- `components/arcagate/workspace/`、`components/arcagate/library/`、`components/settings/`、`components/item/` で sub-component 増加 (V5)
- 新規 subdir 追加なし

## 2. State store 設計 (V4 + V6 + V8 解消)

### 2.1 Class wrapper パターン統一 (A2 SV-1)

A2 SV-1 で確認した「`.svelte.ts` で `export { count }` 直接は frozen で危険」を踏まえ、target store 設計は **Class wrapper** に統一:

```ts
// src/lib/state/workspace-config.svelte.ts (A3 target)
class WorkspaceConfig {
  currentId = $state<string | null>(null);
  list = $state<Workspace[]>([]);

  async select(id: string) {
    this.currentId = id;
    await workspaceIpc.setCurrentWorkspace(id);
  }

  async refresh() {
    this.list = await workspaceIpc.listWorkspaces();
  }
}

export const workspaceConfig = new WorkspaceConfig();
```

singleton export と test 容易性を両立 (test 側で `new WorkspaceConfig()` で fresh instance)。

### 2.2 V4: workspace.svelte.ts (666 LOC) 3 分割

| 新 file                                    | LOC 想定 | 責務                                       |
| ------------------------------------------ | -------: | ------------------------------------------ |
| `state/workspace-config.svelte.ts`         |     ~200 | id / list / select / pan / zoom 設定       |
| `state/workspace-widgets.svelte.ts`        |     ~300 | widget CRUD (add / move / resize / remove) |
| `state/workspace-history.svelte.ts` (既存) |      140 | undo/redo (現状維持)                       |

計算 logic (overlap / free position) は **`utils/widget-grid.ts` に集約** (現存)、state 側は呼ぶだけ。

### 2.3 V6: itemStore → metadataStore invalidation 明示化

target:

```ts
// state/items.svelte.ts (A3 target、抜粋)
class ItemStore {
  // ...
  async update(id: string, patch: ItemPatch) {
    const updated = await itemsIpc.updateItem(id, patch);
    metadataStore.invalidate(id);  // ← 明示 invoke (A2 SV-3 準拠)
    this.refresh();
    return updated;
  }

  async delete(id: string) {
    await itemsIpc.deleteItem(id);
    metadataStore.invalidate(id);  // ← 明示
    this.refresh();
  }

  async create(item: NewItem) {
    const created = await itemsIpc.createItem(item);
    // create は invalidate 不要 (新規 ID なので cache なし)
    this.refresh();
    return created;
  }
}
```

`$effect` で「itemStore 変化 → metadataStore invalidate」を書きたくなる誘惑があるが、これは A2 SV-3 で示した anti-pattern (trace 困難)。**method 内で明示 invoke** が target。

### 2.4 V8: configStore vs themeStore 境界整理

責務切り分け target:

| store          | 担当                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| `configStore`  | UI 設定全般 (card style / sort / size / sidebar 状態 / scroll position) |
| `themeStore`   | 配色 / theme mode (dark/light/custom) のみ                              |
| `paletteStore` | color palette (theme と分離、現状維持)                                  |

両者は **個別に localStorage / IPC 管理**を続ける (融合しない)、ただし responsibility を doc level で明確化。

config store 内に theme key (`theme.mode`) が紛れていれば、themeStore に移管。具体 file 比較は A4 で確認。

### 2.5 store list (target、~18 store)

| store                                                                     | LOC 想定 | 用途                                    |
| ------------------------------------------------------------------------- | -------: | --------------------------------------- |
| **新** `workspace-config.svelte.ts`                                       |     ~200 | (V4 split 後)                           |
| **新** `workspace-widgets.svelte.ts`                                      |     ~300 | (V4 split 後)                           |
| `workspace-history.svelte.ts`                                             |      140 | (現状維持)                              |
| `config.svelte.ts`                                                        |     ~243 | (V8 整理後、UI 設定のみ)                |
| `theme.svelte.ts`                                                         |     ~222 | (V8 整理後、theme のみ)                 |
| `palette.svelte.ts`                                                       |      237 | (現状維持)                              |
| `widget-zoom.svelte.ts`                                                   |      195 | (現状維持)                              |
| `items.svelte.ts`                                                         |     ~210 | (V6 で invalidate invoke 追加、+15 LOC) |
| `library-history.svelte.ts`                                               |      113 | (現状維持)                              |
| `metadata.svelte.ts`                                                      |       87 | (現状維持)                              |
| その他 7 (toast / hidden / help / pointer-drag / updater / error-monitor) |        — | 現状維持                                |

## 3. Component 整理 (V5 解消)

### 3.1 肥大 6 file の split 戦略

| file                              |        LOC | 分割案                                                                                                                       |
| --------------------------------- | ---------: | ---------------------------------------------------------------------------------------------------------------------------- |
| `WorkspaceLayout.svelte` (666)    | 666 → ~200 | + `WorkspaceGrid.svelte` (render) + `WorkspaceDragResize.svelte` (drag/resize handler) + `WorkspaceContextMenu.svelte`       |
| `LibraryMainArea.svelte` (595)    | 595 → ~250 | + `LibraryView.svelte` + `LibrarySearchBar.svelte` (既存 component かも、確認) + `LibrarySortControls.svelte`                |
| `SettingsPanel.svelte` (464)      | 464 → ~120 | + `SettingsThemePane.svelte` + `SettingsSoundPane.svelte` + `SettingsHotkeyPane.svelte` + `SettingsOpenerPane.svelte`        |
| `LibraryDetailPanel.svelte` (371) | 371 → ~150 | + `LibraryDetailHeader.svelte` + `LibraryDetailMetadata.svelte` + `LibraryDetailActions.svelte` + `LibraryDetailTags.svelte` |
| `ItemForm.svelte` (347)           | 347 → ~150 | + `ItemFormBasic.svelte` + `ItemFormTarget.svelte` + `ItemFormTags.svelte`                                                   |
| `ThemeEditor.svelte` (332)        | 332 → ~150 | + `ThemeEditorPreview.svelte` + `ThemeEditorCategoryList.svelte` + `ThemeEditorTokenEditor.svelte`                           |

合計: 親 6 file (~1,020 LOC) + 子 19 file (新規) → 1 file 平均 ~200 LOC。

### 3.2 split 時の注意

- `ui/` (shadcn-svelte) は手動編集禁止 (CLAUDE.md `<critical-rule id="forbidden">`)、影響しない
- 共通 sub-component は `arcagate/common/` に置く (既存 location)
- props / event 設計は親子間で **明示的 contract** (Svelte 5 の `$props()` + callback prop)

## 4. Utils / Widgets (現状維持)

- `utils/` 37 file は domain logic 混入なし (A1 で確認)、現状維持
- ただし `utils/widget-grid.ts` には workspace store から計算 logic を集約 (V4 split 時)
- `widgets/` 13 widget + `_shared/` は構造維持 (legacy item_id 削除のみ V9 で実施)

## 5. Bindings (現状維持)

- `bindings/` 1 file (ts-rs 自動生成) 維持
- 規模が増えれば split を将来検討 (Yaak は複数 file)、Arcagate サイズでは 1 file で十分 (A2 §6)

## 6. Legacy 削除 (V9 解消)

target: legacy `item_id` (単一形式) の互換コードを **全削除**:

| 削除箇所                                    | 対応                                                    |
| ------------------------------------------- | ------------------------------------------------------- |
| `ItemContextMenu.svelte`                    | default opener id 正規化を新形式 (`item_ids[0]`) のみに |
| `ItemSettings.svelte` / `ItemWidget.svelte` | item_ids 収集の単一 fallback を削除                     |
| `widget-configs.ts`                         | legacy comment 削除、type 定義から旧 field を消す       |
| `SystemMonitorWidget.svelte`                | chart_type fallback 削除                                |
| `registry.test.ts`                          | deprecated widget 検出 test を更新                      |

**DB migration**: 023 migration で旧 row の単一 `item_id` を `item_ids: [item_id]` に詰め替え。

## 7. Import / 命名規則 (現状維持)

- file 名: PascalCase (component) / kebab-case (.ts) — 現状混在なし、維持
- import path: `$lib/` alias 統一 — 現状 3,224 ref 維持
- 相対 path: widget `_shared/` 内のみ (12 ref)、維持

詳細 migration 順序は `a3-migration-plan.md`。
