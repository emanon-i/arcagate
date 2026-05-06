# A1 Violations & Refactor Candidates (優先度付き)

`a1-frontend.md` / `a1-backend.md` から抽出した「直すべき」候補を、影響度・難易度・着手単位で優先度づけ。A3 target architecture plan の起点。

## 優先度分類

- **P0 (CRITICAL)** — 設計の固定枠 (CLAUDE.md `<critical-rule id="forbidden">` 周辺) に明示違反、または architecture refactor の前提
- **P1 (HIGH)** — 肥大化 / 責務混在で拡張時のバグ温床になりうる
- **P2 (MID)** — 整理すれば良いが現運用は回っている
- **P3 (LOW)** — cleanup / 命名揃え / legacy 削除

## P0: 設計違反 (即直す)

### V1. commands/ → DbState 直接依存 (layer-leak)

CLAUDE.md 明示: `commands → services → repositories → DB` (逆禁止)、Service Layer が全 IPC エントリーポイントの共通経路。

**現状違反 file (9 件)**:

- `commands/config_commands.rs`
- `commands/export_commands.rs`
- `commands/item_commands.rs`
- `commands/launch_commands.rs`
- `commands/metadata_commands.rs`
- `commands/opener_commands.rs`
- `commands/theme_commands.rs`
- `commands/watched_path_commands.rs`
- `commands/workspace_commands.rs`

**症状**: commands が `crate::db::DbState` を直接受け取り、service に渡しているだけのケース多数。本来 service が DbState を内包し、commands は DTO 入出力のみ担当すべき。

**対応案**: service 関数を `(&service, args) -> Result<...>` 形式に統一し、command 関数は `tauri::State<Arc<XxxService>>` を受ける形に変える。Rust の trait + Arc 構成、または `tauri::State<DbState>` を service 構造体経由でラップ。

### V2. repositories 相互参照 (規約違反)

CLAUDE.md 明示: 「Repository 間の相互参照禁止」。

**現状違反 (3 件)**:

- `repositories/launch_repository.rs` → `crate::repositories::item_repository`
- `repositories/workspace_repository.rs` → `crate::repositories::item_repository::row_to_item` (関数 import)
- `repositories/item_repository.rs` ⇄ `tag_repository` (test 内での相互参照)

**対応案**:

- 共通の row→model 変換 helper (`row_to_item` 等) を `models/item.rs` の `impl Item { fn from_row(...) }` に移管
- launch ↔ item の参照は service 層で join するか、`launch_repository::list_recent()` が item の id だけ返し、service 層で item をまとめて取得する形へ

### V3. watcher/ → repositories 直接依存

`watcher/mod.rs` が `repositories/` を直接 use。layer skip (service 経由でない)。

**対応案**: watcher 用に薄い service (例: `watched_path_service::on_file_event`) を介して repository を叩く形へ。

## P1: 肥大化 file (責務分割)

### V4. frontend store: `state/workspace.svelte.ts` (666 LOC)

混在している責務:

- workspace の config (current id / list / pan / zoom)
- widget mutation (add / move / resize / remove)
- overlap / free position 計算 (utils/widget-grid.ts と重複疑い)
- undo/redo 統合

**対応案**: split を 3-4 に

1. `workspace.svelte.ts` (id / list / select)
2. `workspace-widgets.svelte.ts` (widget CRUD)
3. (既存) `workspace-history.svelte.ts` (undo/redo) — そのまま
4. 計算 logic は `utils/widget-grid.ts` に集約

### V5. frontend component 肥大 6 file (~2,800 LOC)

| file                        | LOC | 分割案                                                            |
| --------------------------- | --: | ----------------------------------------------------------------- |
| `WorkspaceLayout.svelte`    | 666 | grid render / drag-resize / context menu の 3 子 component に分離 |
| `LibraryMainArea.svelte`    | 595 | view / search / sort / detail-pane の 4 component                 |
| `SettingsPanel.svelte`      | 464 | カテゴリ毎の sub panel (theme / sound / hotkey / opener)          |
| `LibraryDetailPanel.svelte` | 371 | header / metadata / actions / tags                                |
| `ItemForm.svelte`           | 347 | basic / target / tags の 3 segment                                |
| `ThemeEditor.svelte`        | 332 | preview / category-list / token-editor                            |

### V6. frontend store: itemStore → metadataStore cache invalidation の明示化

**症状**: `itemStore` mutation 系 (create / update / delete) で `metadataStore` cache を invalidate していない。`metadataStore` は TTL 60s で自動 expire するが、UI 反映に 60s 以内のラグが残る。Lessons.md B-class (mutation 後の sidebar stale) の派生 risk。

**対応案**: itemStore mutation 関数内で `metadataStore.invalidate(itemId)` を明示 invoke。または item event bus を導入。

## P2: 配置・命名

### V7. `services/icon_cache_repository.rs` の配置混乱

services/ 配下に `_repository` 命名。実際は repositories/ にある `icon_cache_repository.rs` (DB 層) と別物 (service として in-memory cache 運用) の可能性。命名重複が混乱を招く。

**対応案**: `services/icon_cache_service.rs` に rename + 内部用語を統一。

### V8. configStore vs themeStore の境界曖昧

両者ともローカル設定 + IPC で persist しているが、責務境界が暗黙的。configStore にテーマ系 key が紛れている可能性。

**対応案**: A2 で reference impl (Pot / Yaak 等) の preferences store 設計を調査して、A3 で境界 redesign。

## P3: cleanup / legacy

### V9. legacy `item_id` 単一形式の互換コード (14 ref)

新形式 `item_ids[]` (multi) と旧形式単一 `item_id` の併存。所在:

- `ItemContextMenu.svelte` (default opener id 正規化)
- `ItemSettings.svelte` / `ItemWidget.svelte` (item_ids 収集 + 単一 fallback)
- `widget-configs.ts` (legacy comment)
- `SystemMonitorWidget.svelte` (chart_type fallback)
- `registry.test.ts` (deprecated widget 検出 test)

**対応案**: 旧 `item_id` field を全削除し、migration で旧 row を `item_ids[<id>]` に詰め替え (DB 上の移行)。

### V10. `#[allow(dead_code)]` の棚卸 (15 件)

主に test utilities / feature-gated だが、本当に未使用のものを 1-2 件は削除候補に降格できる可能性。

## サマリー

| 優先度 | 件数 | 例                                                                         |
| ------ | ---: | -------------------------------------------------------------------------- |
| P0     |    3 | V1 commands→DbState、V2 repo 相互参照、V3 watcher 層違反                   |
| P1     |    3 | V4 workspace store 666、V5 component 肥大 6 file、V6 metadata invalidation |
| P2     |    2 | V7 icon_cache 命名、V8 config/theme 境界                                   |
| P3     |    2 | V9 legacy item_id、V10 allow(dead_code)                                    |

A3 では P0 → P1 → P2 → P3 の順に migration 手順 (small PR 群) を作成する。各 PR は `refactor/<scope>-<short>` 命名で test gate auto-skip 下に出す。
