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

### V6. frontend store: itemStore → metadataStore cache invalidation の明示化 ✅ 先行解消済

**ステータス**: **解消済 (A1 audit 漏れ)** — PR-E sequence 中の確認で発見。`#284 (1e83eab) fix(library): Phase L1 bug fix` で先行対応済。

**現状実装** (`src/lib/state/items.svelte.ts`):

- `updateItem` 内で `metadataStore.invalidate(id)` 呼び出し済 (line 64)
- `deleteItem` 内で `metadataStore.invalidate(id)` 呼び出し済 (line 91)
- `createItem` は invalidate 不要 (新規 ID は cache なし、A3 §2.3 と一致)

**audit 時の症状記述** (参考、当時は実装未確認だった):

> `itemStore` mutation 系 (create / update / delete) で `metadataStore` cache を invalidate していない。`metadataStore` は TTL 60s で自動 expire するが、UI 反映に 60s 以内のラグが残る。Lessons.md B-class (mutation 後の sidebar stale) の派生 risk。

**対応案** (実施済):

> itemStore mutation 関数内で `metadataStore.invalidate(itemId)` を明示 invoke。または item event bus を導入。

A3 migration plan の PR-F (V6) は **scope なし**として skip、本注記の doc PR (PR-F) のみ発行。

## P2: 配置・命名

### V7. `services/icon_cache_repository.rs` の配置混乱 ✅ 実態と乖離 (audit 漏れ)

**ステータス**: **scope なし** — A3 PR-G 着手時の確認で audit 前提が実態と乖離していたことを発見。

**実態確認**:

- `src-tauri/src/services/` 配下に `_repository` 命名のファイル **0 件** (`mod.rs` 含め全 20 file 確認済)
- `src-tauri/src/services/icon_cache_*.rs` も **存在しない**
- `src-tauri/src/repositories/icon_cache_repository.rs` のみ (DB 層、正しい配置)
- in-memory cache 運用は `services/item_service.rs::extract_item_icon_cached` 関数で実装、別 file 化されておらず命名混乱の前提が成立しない

audit 文言が「services/ 配下に `_repository` 命名」「`services/icon_cache_repository.rs` (DB 層)」と書いていたが、実際は `repositories/icon_cache_repository.rs` のことを指したと推測 (path 誤記)。配置自体は正しく、命名混乱は実体無し。

**audit 時の症状記述** (参考、誤記の可能性):

> services/ 配下に `_repository` 命名。実際は repositories/ にある `icon_cache_repository.rs` (DB 層) と別物 (service として in-memory cache 運用) の可能性。命名重複が混乱を招く。

**対応案** (元提案、scope なし):

> `services/icon_cache_service.rs` に rename + 内部用語を統一。

A3 migration plan の PR-G (V7) は **scope なし**として skip。

### V8. configStore vs themeStore の境界曖昧 ✅ 既にクリーン (audit 漏れ)

**ステータス**: **scope なし** — A3 PR-G 着手時の確認で境界が既にクリーンと判明。

**実態確認**:

- `src/lib/state/config.svelte.ts` の field 全列挙: `hotkey` / `autostart` / `setupComplete` / `loading` / `error` / `itemSize` / `libraryCard` / `librarySort` / `widgetZoom` 等
- **theme 関連 key 0 件** (`theme` を含む field 名 grep で 0 hit)
- `src/lib/state/theme.svelte.ts` は theme 専用 (themes / activeMode / resolveMode / applyTheme 等)
- 責務境界はクリーン、theme key の混在なし

**audit 時の症状記述** (参考、当時は実装未確認だった):

> 両者ともローカル設定 + IPC で persist しているが、責務境界が暗黙的。configStore にテーマ系 key が紛れている可能性。

**対応案** (元提案、scope なし):

> A2 で reference impl (Pot / Yaak 等) の preferences store 設計を調査して、A3 で境界 redesign。

A3 migration plan の PR-G (V8) は **scope なし**として skip。本注記の doc PR (PR-G) のみ発行。

## P3: cleanup / legacy

### V9. legacy `item_id` 単一形式の互換コード ✅ 解消済 (A3 PR-H)

**ステータス**: **解消済** — A3 PR-H で対応:

- `src/lib/widgets/item/ItemSettings.svelte`: `item_id` field を type def / fallback / null reset から削除
- `src/lib/widgets/item/ItemWidget.svelte`: 同上
- DB migration `023_drop_legacy_item_id.sql`: 既存 `workspace_widgets.config` 内の `item_id` を `item_ids[<id>]` に詰め替え + `item_id` キー削除

**audit 言及のうち scope 外** (item_id legacy とは別 concern、本 PR では touch せず):

- `ItemContextMenu.svelte` (default opener id 正規化) — `item.default_app` の legacy 値の話、`item_id` とは別 concern
- `widget-configs.ts` (legacy comment) — ファイル **存在しない** (audit 誤記の可能性)
- `SystemMonitorWidget.svelte` (chart_type fallback) — `chart_type` legacy field の話、`item_id` とは別 concern
- `registry.test.ts` (deprecated widget 検出 test) — deprecated widget 検出 test、`item_id` とは無関係

`src/lib/widgets/item/index.ts:16` は **comment のみ** (実装変更なし、scope 外)。

### V10. `#[allow(dead_code)]` の棚卸 ✅ 棚卸済 (削除候補 0 件、保留)

**ステータス**: **棚卸完了、削除候補 0 件** — A3 PR-H 着手時の確認:

| 場所                                                  | 件数 | 性質                                         |
| ----------------------------------------------------- | ---- | -------------------------------------------- |
| `services/crash_monitor_service.rs` (3)               | 3    | R10-D crash_monitor (future feature)         |
| `services/telemetry_service.rs` (4)                   | 4    | R10 系 telemetry (future feature)            |
| `repositories/widget_item_settings_repository.rs` (2) | 2    | resurrect logic (PH-issue-023 Phase B)       |
| `db/mod.rs` / `lib.rs` (2)                            | 2    | startup 初期化 helper (build feature 別経路) |
| `models/launch.rs` (1)                                | 1    | launch_log 系 future API                     |
| `repositories/tag_repository.rs` (1)                  | 1    | test utility                                 |
| `utils/error.rs` / `utils/http_client.rs` (2)         | 2    | utility helper (将来 reuse 想定)             |

合計 15 件すべて **future feature / test utility / build feature 別経路**。本当に未使用のものは無く、削除候補 0 件と判定、現状維持。

audit「本当に未使用のものを 1-2 件は削除候補に降格できる**可能性**」 という保留的記述に対し、確認結果として **0 件** と確定。

## サマリー

| 優先度 | 件数 | 例                                                                         |
| ------ | ---: | -------------------------------------------------------------------------- |
| P0     |    3 | V1 commands→DbState、V2 repo 相互参照、V3 watcher 層違反                   |
| P1     |    3 | V4 workspace store 666、V5 component 肥大 6 file、V6 metadata invalidation |
| P2     |    2 | V7 icon_cache 命名、V8 config/theme 境界                                   |
| P3     |    2 | V9 legacy item_id、V10 allow(dead_code)                                    |

A3 では P0 → P1 → P2 → P3 の順に migration 手順 (small PR 群) を作成する。各 PR は `refactor/<scope>-<short>` 命名で test gate auto-skip 下に出す。
