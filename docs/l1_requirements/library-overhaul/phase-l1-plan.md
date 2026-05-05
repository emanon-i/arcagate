# Phase L1 Plan: Library bug fix

**Status**: Plan / 実装着手 OK (user 承認済 = D1-D8 全部 agent 推奨 + continuous mode)
**Scope**: I1 / I2 / I3 + その他 crash の root cause fix のみ。UX 設計 (L2) / 機能追加 (L3) は触らない。
**Date**: 2026-05-05
**Predecessor**: [investigation.md](./investigation.md) + [known-issues.md](./known-issues.md)
**Design 軸**: [design-direction.md](./design-direction.md) §0.4 「L1 = bug fix 主、Industrial Yellow 適用は控えめ、既存 token に揃える」

## 0. 仕様確定 (D1-D8 から)

| #  | decision                          | 適用箇所                               |
| -- | --------------------------------- | -------------------------------------- |
| D1 | Library / Workspace card 独立維持 | Phase L1 で触らず                      |
| D2 | icon cache hybrid (memory + fs)   | I3 F2 で memory cache 追加             |
| D3 | Playnite 路線                     | L2 で view toggle、L1 では現 grid 維持 |
| D4 | I3 fix = A3 (F1+F2+F3)            | 本 Plan 主体                           |
| D5 | virtualization @tanstack          | L3 で扱う、L1 範囲外                   |
| D6 | Trash + toast undo                | L2 で扱う、L1 範囲外                   |
| D7 | wanakana                          | L2 で扱う、L1 範囲外                   |
| D8 | L1 → L2 → L3 順次                 | 本 Plan の進行                         |

## 1. commit 構造 (5-7 commit、squash merge)

| #  | 種別                   | 内容                                                                                               |
| -- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| C1 | fix(launch)            | I1: ExeFolderWatchWidget / FileSearchWidget の `cmd_open_path` を `launchItem(item.id)` 経由に置換 |
| C2 | feat(ipc)              | I3 F1: `cmd_get_items_metadata_batch(ids)` Rust 側追加 + TS wrapper                                |
| C3 | refactor(library-card) | I3 F1+F2: LibraryCard の per-item $effect → store 経由 batch fetch + memory cache (TTL 60s)        |
| C4 | perf(icon)             | I3 F3: `cmd_extract_item_icon` を `tokio::spawn_blocking` で非 block                               |
| C5 | fix(item-widget)       | I2: 再現確認後、root cause に応じた fix                                                            |
| C6 | chore(crash-audit)     | dev console error / log を grep + 拾えた crash 一括対処                                            |
| C7 | docs(spec)             | ux_standards.md に L1 fix 影響範囲を追記、lessons.md に I3 教訓                                    |

各 commit で `pnpm verify` 全 pass を確認、落ちたら次に進まない。

## 2. fix 詳細

### C1: I1 fix (~30 min)

**touch**:

- `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte` (L231-241): `launchEntry` を書き直し
- `src/lib/widgets/file-search/FileSearchWidget.svelte` (L132 周辺): 同様
- `src/lib/ipc/launch.ts`: `launchItemByTarget(targetPath)` helper 追加 (target で item lookup → launchItem)

**logic**:

```ts
async function launchEntry(entry: ExeFolderEntry) {
    const exePath = resolveExe(entry);
    if (!exePath) { toastStore.add('exe 見つからず', 'error'); return; }
    // Library item を target path で lookup
    const item = itemStore.items.find((i) => i.target === exePath);
    if (item) {
        await launchItem(item.id).catch(...);  // launch_log 記録
    } else {
        // fallback: cmd_open_path (auto-register 前 / scan 中の race)
        await invoke('cmd_open_path', { path: exePath }).catch(...);
    }
}
```

**verify**: dev で ExeFolder 起動 → Recent widget に出ること CDP で確認。

### C2 + C3: I3 F1 + F2 (~3 h)

**touch**:

- `src-tauri/src/commands/item_commands.rs`: `cmd_get_items_metadata_batch(ids: Vec<String>) -> Vec<(String, ItemMetadata)>` 追加
- `src-tauri/src/services/item_service.rs`: batch metadata 取得 (filesystem stat を tokio::spawn_blocking で並列)
- `src/lib/ipc/items.ts`: `getItemsMetadataBatch(ids)` wrapper
- `src/lib/state/items.svelte.ts`: metadata cache store 追加 (Map<id, {meta, expiresAt}>)
  - `loadMetadataForItems(ids)` で TTL 60s cache、未 cache 分のみ batch IPC
- `src/lib/components/arcagate/library/LibraryCard.svelte`: 個別 $effect → store の cache 参照に変更

**設計**: cache TTL 60s、cache miss は batch fetch (LibraryMainArea が visible item ids をまとめて要求)。LibraryCard は subscribe するだけ、自前で IPC しない。

### C4: I3 F3 (~30 min)

**touch**:

- `src-tauri/src/commands/item_commands.rs`: `cmd_extract_item_icon` の同期処理を `tokio::task::spawn_blocking` でラップ

**logic**:

```rust
#[tauri::command]
pub async fn cmd_extract_item_icon(exe_path: String, db: State<'_, DbState>) -> Result<String, AppError> {
    tokio::task::spawn_blocking(move || {
        item_service::extract_icon(&exe_path)
    }).await.map_err(|_| AppError::Internal("spawn_blocking failed".into()))?
}
```

**verify**: drag-drop で exe 投入時に UI freeze しないことを CDP eval で確認 (timing 計測)。

### C5: I2 fix (~1-2 h、再現次第)

**手順**:

1. dev で ItemWidget アイテム追加 flow を CDP で再現
2. console error / Tauri log を capture
3. root cause 確定
4. 修正 + test

**仮説優先度** (known-issues.md §3.2 より):

- (a) Library 空 (UX 課題、crash ではない) → user 教育 + empty picker 改善
- (b) bind:config 伝搬問題 → bind 修正 + test
- (c) updateWidgetConfig err → schema sanitize + test
- (d) item lookup orphan → orphan filter + test

### C6: その他 crash 棚卸し (~1 h)

**手順**:

1. `pnpm tauri dev` で Library 全主要操作を一巡 (add / edit / delete / bulk / tag CRUD / search)
2. dev console error / Tauri panic log を grep
3. 拾えた crash すべてを root cause で fix or 文書化 (Phase L2/L3 持ち越し判断)

### C7: docs (~30 min)

**touch**:

- `docs/l1_requirements/ux_standards.md`: L1 fix の影響範囲を追記 (cmd_open_path → launchItem の方針変更等)
- `docs/lessons.md`: I3 の教訓 (per-card $effect IPC 並列の罠、batch + cache の正解 pattern)

## 3. design checklist (本 Plan 範囲、L1 限定)

### Industrial Yellow 適用箇所

- 本 PR では **新規 dialog / panel を作らない** → Industrial Yellow 適用箇所なし
- 既存 token (`--ag-accent`, `--ag-error-text` 等) を引き継ぐ修正のみ

### widget UX 常識 checklist

- [x] **削除確認**: 本 PR 範囲では新規追加なし (既存 LibraryDetailPanel の削除 confirm に手を入れない)
- [x] **半透明 / ぼかし**: 本 PR 範囲で増えない
- [x] **label**: I1 fix で toast message 文言を「機能 / 状態」 に整合 (例: 「○○ を起動しました」 維持)
- [x] **keyboard a11y**: 本 PR で focus 経路を変更しない
- [x] **「普通のアプリならそうしない」**: I3 fix で 69+ item の応答性を確保 (これは「普通のアプリなら virtualization してる」相当の改善)
- [x] **設定変えたら即見た目**: I3 cache TTL 60s で immediate response、stale データは next batch fetch で更新
- [x] **DOM 存在 = 治った 禁止**: 実機 CDP screenshot + 動作確認 + Codex review 三点セット必須

## 4. verification matrix

### unit (vitest)

- C2: `cmd_get_items_metadata_batch` の Rust unit test (空 ids / 単一 / 複数 / 重複)
- C3: items.svelte.ts の cache TTL test (cache hit / miss / 期限切れ)
- C4: spawn_blocking ラッパーの非 block 性は手動検証 (timing 計測)

### e2e (Playwright)

- C1: ExeFolder 起動 → cmd_get_recent_launches で +1 件
- C3: 大量 item (50+) で Library scroll 中に IPC 件数 < N batch (count via mock)

### 実機 CDP screenshot

- I1: ExeFolder 起動前 / 後 の Recent widget
- I3: 50 item Library scroll 中の frame rate 計測 (CDP `Performance.metrics`)
- I2: 再現 + fix 前後 screenshot

### Codex 二次レビュー

PR 作成前に `/run-codex review src/lib/widgets/exe-folder/ src/lib/state/items.svelte.ts src-tauri/src/services/item_service.rs` で機械的退行検出。判定は信用しない、検出のみ参考。

## 5. branch / PR 戦略

- **branch**: `fix/library-l1-bug-fix` (main から切る、PR #283 反映後の最新)
- **単発 PR で squash merge** (commit C1-C7 が論理単位 1 個)
- **title**: `fix(library): Phase L1 bug fix (I1 launch_log + I2 item-widget crash + I3 大量 item 性能)`
- **body**: 検収シナリオ + 残課題 + rollback

## 6. rollback

`git revert <PR-merge-commit>` で完全戻し。
個別問題が出たら fix-forward (新 PR で部分修正)。

## 7. 残課題 (Phase L1 範囲外)

- **L2 へ**: keyboard nav / undo / filter / search / empty state / view toggle
- **L3 へ**: virtualization / 高度 bulk / icon variants / dynamic collection / grouping / frecency
- **D9** (`industrial-yellow-spec.md` 起こし) → L2 着手時の最初の task

## 8. 連続 mode 規律

- L1 PR 作成完了 → 即 L2 plan 着手 (user 待ちなし)
- 退行検出時のみ user に止めて報告
- design checklist (§3) を Plan/PR description に必ず転記
