# A3 Migration Plan (P0-P3 順、独立 mergeable PR list)

A1 violation V1-V10 を、A2 best practice + A3 target shape に沿って refactor する PR 群。各 PR は **`refactor/<scope>-<short>`** branch で発行 (CI test gate auto-skip 下)、user 確認後着手 + merge。

## 全体: 8-10 PR、優先度順

| 段階   | PR 件数 | 対象 finding | 退行 risk                            |
| ------ | ------: | ------------ | ------------------------------------ |
| **P0** |     3-5 | V1, V2, V3   | 中-高 (規約違反解消、IPC 全範囲影響) |
| **P1** |       3 | V4, V5, V6   | 中 (UI 影響、store split)            |
| **P2** |       1 | V7, V8 統合  | 低                                   |
| **P3** |       1 | V9, V10 統合 | 中 (DB migration 含む)               |

merge 順序の **ハード依存**: PR-B (V2 row_to_X 移管) → PR-A 系 (V1 service struct 化)。それ以外は並行可。

---

## P0: 規約違反解消

### PR-B: V2 解消 — row_to_X helper を models へ移管

- **branch**: `refactor/repo-row-helpers`
- **scope**: 1-3 file
  - `models/item.rs` に `impl Item { pub fn from_row(...) }` 追加
  - `models/workspace.rs`, `models/tag.rs` 等にも同様
  - `repositories/workspace_repository.rs` の `row_to_item` import を `Item::from_row` に置換
  - `repositories/launch_repository.rs` の `row_to_item` import を置換
- **退行 risk**: 中 (DB row → struct 変換 logic、SELECT クエリ全部に関係)
- **検証**: agent dev で item / workspace 一覧が表示されること
- **merge 後**: PR-A 系の前提が成立

### PR-A1: V1 解消 (1/3) — ItemService struct 化

- **branch**: `refactor/service-struct-item`
- **scope**: 2-3 file
  - `services/item_service.rs` を `pub struct ItemService { db: Arc<DbState> }` 化
  - `lib.rs` setup で `app.manage(ItemService::new(db.clone()))` 追加
  - `commands/item_commands.rs` 25 commands を `State<'_, ItemService>` で受ける形に
- **退行 risk**: 高 (item 関連 IPC 25 件全体)
- **検証**: agent dev で item CRUD / 検索 / tag 操作 / launch が動作

### PR-A2: V1 解消 (2/3) — WorkspaceService struct 化

- **branch**: `refactor/service-struct-workspace`
- **scope**: 2-3 file (workspace_service.rs / lib.rs / workspace_commands.rs)
- **退行 risk**: 高 (workspace + widget IPC 16 件)
- **検証**: agent dev で workspace 切替 / widget 配置 / wallpaper

### PR-A3: V1 解消 (3/3) — 残り 7 service struct 化

- **branch**: `refactor/service-struct-rest`
- **scope**: 7 service (config / theme / launch / metadata / opener / watched_path / export) + 関連 commands
- **退行 risk**: 中-高 (各 service の影響範囲は中だが累積で多い)
- **検証**: 設定画面 / theme 切替 / launch / opener / metadata 表示

### PR-C: V3 解消 — watcher を service 経由に

- **branch**: `refactor/watcher-via-service`
- **scope**: 2 file (watcher/mod.rs + services/watched_path_service.rs)
- **退行 risk**: 低 (file watcher 限定機能)
- **検証**: 監視フォルダに file 追加 → library に反映

---

## P1: 肥大化解消

### PR-D: V4 解消 — workspace store 666 LOC を 3 分割

- **branch**: `refactor/workspace-store-split`
- **scope**: state/ で 3 file 新設、import 元 (workspace 系 component / widget) で参照修正
  - `state/workspace-config.svelte.ts` (新)
  - `state/workspace-widgets.svelte.ts` (新)
  - `state/workspace.svelte.ts` (削除 or facade として残す)
- **退行 risk**: 中 (workspace UI 全体)
- **検証**: agent dev で workspace 切替 / widget D&D / undo/redo

### PR-E: V5 解消 — 肥大 component 6 file を split

複数 PR に分割する選択肢もあるが、各 file が独立で並行作業可。1 PR で 6 file まとめるか、3 PR に分けるかは user judgment。

#### Option A: 1 PR (まとめる)

- **branch**: `refactor/component-split`
- **scope**: 6 親 file + ~19 子 file 新設
- **退行 risk**: 中 (UI のみ)
- **検証**: agent dev で各 panel / dialog の動作確認

#### Option B: 3 PR (分散)

- `refactor/workspace-component-split` (WorkspaceLayout)
- `refactor/library-component-split` (LibraryMainArea + LibraryDetailPanel)
- `refactor/settings-component-split` (SettingsPanel + ThemeEditor + ItemForm)

A4 で user judgment、Option B が安全。

### PR-F: V6 解消 — itemStore → metadataStore 明示 invalidate

- **branch**: `refactor/item-metadata-invalidate`
- **scope**: 1 file (`state/items.svelte.ts` の create / update / delete method)
- **退行 risk**: 低 (cache invalidation の明示化、tracing 容易になる)
- **検証**: item 編集 → sidebar metadata がすぐ反映されること

---

## P2: 配置・命名整理

### PR-G: V7 + V8 解消 — 配置・命名整理

- **branch**: `refactor/naming-cleanup`
- **scope**:
  - `services/icon_cache_repository.rs` → `services/icon_cache_service.rs` rename + 内部用語統一 (V7)
  - `state/config.svelte.ts` から theme 関連 key を `state/theme.svelte.ts` へ移管 (V8、必要時)
- **退行 risk**: 低 (機能変更なし、命名整理のみ)
- **検証**: agent dev で icon 表示 / 設定画面が変化なし

---

## P3: legacy + dead code

### PR-H: V9 + V10 解消 — legacy item_id 削除 + dead_code 棚卸

- **branch**: `refactor/legacy-cleanup`
- **scope**:
  - DB migration `023_drop_legacy_item_id.sql` (旧 row を新形式に詰め替え)
  - 14 ref の legacy code 削除 (ItemContextMenu / ItemSettings / ItemWidget / widget-configs / SystemMonitorWidget / registry.test)
  - `#[allow(dead_code)]` 棚卸 (15 件中、本当に未使用のもの 1-2 件削除)
- **退行 risk**: 中 (DB 変更含む、user の既存 DB 互換)
- **検証**: agent dev で既存 widget が legacy data と互換、新規データ作成も正常

---

## 番外: refactor 完了後

### PR-Z: test 全削除 + skip 機構解除 + 再構築 plan (mechanical、本 sequence の closing PR)

- **branch**: `refactor/test-rebuild`
- **scope** (確定、user 判断で旧 scope の「test 再構築」は PR-Z2 以降の incremental phase に分離):
  - frontend test 全削除 (`tests/` 43 file + `src/**/*.test.ts` 35 file)
  - `vitest.config.ts` / `playwright.config.ts` 削除
  - `package.json` から test scripts (`test` / `test:coverage` / `test:e2e*`) + dev deps (`vitest` / `@playwright/test` / `@vitest/coverage-v8` / `@axe-core/playwright` / `@testing-library/svelte` / `jsdom`) 削除
  - `.github/workflows/e2e.yml` / `e2e-nightly.yml` 削除
  - `.github/workflows/ci.yml` の Vitest step 削除 + refactor branch test gate skip 解除
  - `lefthook.yml` の cargo-test 維持 (frontend test は元々 pre-push 不在)
  - `CLAUDE.md` Branch convention を「過去形化」(refactor 期間終了 mark)
  - **新 plan doc** `docs/l1_requirements/test-rebuild/index.md` (T1-T4 phase) 作成
  - Rust inline test (`#[cfg(test)]`、39 file) は **維持** (migration safety / build correctness)
- **依存**: PR-A1〜PR-H + PR-workspace-race-fix の全完了後
- **退行 risk**: 低 (mechanical 削除、Rust 側は touch せず)
- **検証**: svelte-check / biome / cargo clippy / cargo test (migration 含む) / build 全 pass

### PR-Z2 以降: T1-T4 incremental 実装

詳細: `docs/l1_requirements/test-rebuild/index.md`

- T1 smoke (5-10 件、playwright)
- T2 critical path (10-15 件、playwright + vitest)
- T3 real bug regression (5-10 件、lessons.md 起点)
- T4 core IPC / state / utility (10-15 件、vitest)

合計 30-50 test、CI 完走 8-10 min 想定。各 PR 5-15 件ずつ追加。

---

## 各 PR の共通実施手順 (A4 準拠)

各 PR で:

1. `git fetch origin && git checkout -b refactor/<scope>-<short> origin/main`
2. scope 通りに実装 (1-3 file 中心)
3. ローカル type-check pass:
   - svelte-check 0 errors
   - cargo clippy 0 warnings
   - cargo fmt --check
   - biome check src
4. **agent dev + screenshot 自己評価**: CDP screenshot で before/after 比較、Read で目視評価
5. **Codex review** で品質担保 (`/run-codex` で 2nd opinion)
6. push → PR 作成 (PR description に「scope / 退行 risk / 検証手順 / refactor branch なので test gate skip」を明記)
7. user 確認 → merge → 次 PR 着手

---

## 真ブロッカー候補と対処方針 (A4 で当たった時の備え)

### B1: PR-A 系で `tauri::State` 多重注入が複雑化

- 15 service すべて個別 `State<'_, XxxService>` で受けると command の signature が冗長
- 対処案: 単一 `AppServices { item: ItemService, workspace: WorkspaceService, ... }` 構造体にまとめ、`State<'_, AppServices>` 1 つで全 service にアクセスする形
- 公式推奨ではない (各 state を個別に manage が標準) が、Arcagate 規模では実用的判断あり
- A4 で PR-A1 着手時に判定

### B2: PR-D (workspace store split) で history 同期が壊れる

- workspace-config / workspace-widgets / workspace-history の 3 store 間で undo/redo の対象範囲を明確に切らないとバグる
- 対処案: history は widgets store の mutation のみ対象 (config 系の change は履歴に積まない) と明示する
- design 段階で確定させてから実装

### B3: PR-H で既存 user の DB との互換性

- legacy item_id を持つ user の DB が一定数存在する想定
- 対処案: migration 023 で必ず詰め替え、migration 失敗時は graceful に旧形式を読む fallback を 1 release 残す

A4 で当たった時に備え、ここに残す。
