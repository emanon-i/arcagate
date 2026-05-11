# A1 Current State Audit (index)

大規模 refactor 期間 (Refactor Era) 着手前の現状把握。`refactor/*` branch 配下で進める。

## Scope

- frontend: `src/lib/` の module 構造 / state stores / components / utils / widgets / bindings
- backend: `src-tauri/src/` の commands / services / repositories / models / db / utils / lib.rs
- 横断: IPC commands 全 list、レイヤー違反、命名規則、死コード sniff、肥大化 file

## 関連 doc

| File               | 内容                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| `a1-frontend.md`   | frontend `src/lib/` の構造・stores・components・utils・widgets              |
| `a1-backend.md`    | backend `src-tauri/src/` の構造・commands・services・repositories・IPC list |
| `a1-violations.md` | レイヤー違反 / cross-ref 違反 / 肥大化 / 命名混在 / refactor 候補優先度     |

## 規模感 (raw stats)

| Layer                                |               files |                                   total LOC |
| ------------------------------------ | ------------------: | ------------------------------------------: |
| frontend `src/lib/` (state)          |            15 store |                                      ~2,800 |
| frontend `src/lib/components/`       |          96 .svelte | ~10,000 (肥大 6 file で約 2,800 LOC を占有) |
| frontend `src/lib/utils/`            |      37 (test 込み) |                                      ~1,800 |
| frontend `src/lib/widgets/`          | 13 widget + _shared |                                           — |
| frontend `src/lib/ipc/`              |           9 wrapper |                                           — |
| backend `src-tauri/src/` 全体        |              70 .rs |                                      11,462 |
| backend `commands/`                  |                  14 |                                         739 |
| backend `services/`                  |                  18 |                                       4,358 |
| backend `repositories/`              |                  11 |                                       2,987 |
| backend `models/`                    |                  10 |                                         658 |
| migrations (`src-tauri/migrations/`) |              22 SQL |                                    001..022 |
| IPC commands (`#[tauri::command]`)   |             88 関数 |         `cmd_` prefix 統一、handler! 全登録 |

## Key findings (要約)

詳細は `a1-violations.md`。

### 設計の固定枠 違反 (CRITICAL)

1. **commands → DbState 直接依存**: `commands/` 9 file が `crate::db::DbState` を直接 use。規約 `commands → services → repositories → DB` に対し、commands に DB 依存が露出している (service が抽象を成立させていない)。
2. **repositories 相互参照**:
   - `launch_repository` → `item_repository`
   - `workspace_repository` → `item_repository::row_to_item` (関数 import)
   - `item_repository` ⇄ `tag_repository` (test)
3. **watcher 層違反**: `watcher/mod.rs` が `repositories/` を直接 use (service skip)。

### 肥大化 file (refactor 着手候補)

| file                                                    | LOC | 種別                                       |
| ------------------------------------------------------- | --: | ------------------------------------------ |
| `src/lib/state/workspace.svelte.ts`                     | 666 | store (config + behavior + history 混在)   |
| `components/arcagate/workspace/WorkspaceLayout.svelte`  | 666 | component (grid + drag + resize + context) |
| `components/arcagate/library/LibraryMainArea.svelte`    | 595 | component                                  |
| `components/settings/SettingsPanel.svelte`              | 464 | component                                  |
| `components/arcagate/library/LibraryDetailPanel.svelte` | 371 | component                                  |
| `components/item/ItemForm.svelte`                       | 347 | component                                  |
| `components/settings/ThemeEditor.svelte`                | 332 | component                                  |

### Frontend store 責務漏れ

- `itemStore` mutation 時に `metadataStore` の cache invalidation が **暗黙的依存**（明示的 invoke なし）。Lessons.md の B-class (mutation 後の sidebar stale) の派生 risk。

### Legacy 後方互換

- `item_ids[]` (新) と単一 `item_id` (legacy) の併存 = 14 ref。ItemContextMenu / ItemSettings / ItemWidget / widget-configs / SystemMonitorWidget に分散。

### 良好な点

- IPC 命令命名 `cmd_*` で 88/88 統一、handler! 登録漏れなし
- frontend file 名 (PascalCase / kebab-case) と import alias (`$lib/`) 統一
- migration sequential numbering 維持、ORM 不使用方針堅持
- AppError `{ code, message }` Serialize 構造体、15 variants で一貫
- TODO/FIXME/HACK marker = **0** (frontend / backend 両方)

## A2 / A3 への接続

`a1-violations.md` の優先度付き refactor 候補が A3 target architecture の起点になる。A2 では Tauri v2 reference apps (Pot / Yaak / 等) と Svelte 5 runes module 境界 best practice を調査し、A3 で folder 構造・命名・依存方向の target shape と migration 手順を確定させる。
