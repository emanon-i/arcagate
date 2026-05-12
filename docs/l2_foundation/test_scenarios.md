# Arcagate Test Scenarios (L2)

テストシナリオ ⇄ テスト実装の **mapping single source**。 daily-use の critical path を保証する最小集合と、 過去 bug の regression 防止を集中管理する。

引用元 guideline: PR-Z で frontend test 全削除 → minimal essential で incremental 再構築 (2026-05-06 user 判断)。

---

## 原則

> **minimal essential、 necessary and sufficient**

- 過剰 coverage を狙わない (refactor 中に壊れない最小集合)
- 各 test は **明確な目的**を持つ (smoke / critical path / real bug regression / core IPC)
- 「念のため」 test は書かない (LoC の浪費、 「微妙なら削る」 daily-use-test 原則と整合)
- CI 全完走 **8-10 分** 想定 (現実装の build + check + Rust test ~5-7 min + frontend test 2-3 min)

---

## Phase 構成 (T1-T4)

| phase  | scope                                                            | 件数目標 | 主 tooling | 想定 CI 増分 |
| ------ | ---------------------------------------------------------------- | -------- | ---------- | ------------ |
| **T1** | smoke (起動 / 主画面 render / 基本 IPC pass)                     | 5-10     | Playwright | 1-2 min      |
| **T2** | critical path (item CRUD / workspace 切替 / widget D&D / launch) | 10-15    | Playwright | 2-3 min      |
| **T3** | real bug regression + state store race                           | 5-10     | Playwright | 1-2 min      |
| **T4** | core utility (frontend pure 関数)                                | 10-15    | vitest     | 0.5 min      |

合計 **30-50 test** 想定。 Rust inline test (288 件、 維持) と合わせて CI で **~320-340 test** 実行。

---

## T1: smoke (5-10 件)

**目的**: アプリが起動して主画面が render されること、 基本 IPC が pass することを保証。 stale な regression を即座に検出する garde-fou。

| ID   | scenario                                          | spec 実装                                      |
| ---- | ------------------------------------------------- | ---------------------------------------------- |
| T1-1 | アプリ起動 → `<main>` element が visible          | `tests/e2e/smoke.spec.ts:app startup`          |
| T1-2 | default library 画面 + 検索 bar が render         | `tests/e2e/smoke.spec.ts:library view default` |
| T1-3 | Workspace tab 切替 → canvas toolbar visible       | `tests/e2e/smoke.spec.ts:workspace view`       |
| T1-4 | Settings modal 開閉 + category tablist            | `tests/e2e/smoke.spec.ts:settings modal`       |
| T1-5 | 基本 IPC: `listWorkspaces` ≥ 1 (Home auto-create) | `tests/e2e/smoke.spec.ts:basic IPC`            |

含めないもの: 個別機能の詳細動作 (T2 で扱う)。

---

## T2: critical path (10-15 件)

**目的**: 日常使う **golden path** が壊れていないことを保証。

候補 scenario:

| ID      | scenario                                           | 主 IPC / 操作                                   |
| ------- | -------------------------------------------------- | ----------------------------------------------- |
| T2-2-1  | item 追加 (DropZone / form submit) → library 表示  | `cmd_create_item`、 `cmd_list_items`            |
| T2-2-2  | item 編集 (label / target) → 反映                  | `cmd_update_item`                               |
| T2-2-3  | item 削除 + Undo                                   | `cmd_delete_item`                               |
| T2-2-4  | workspace 切替 → widgets 切替 (PR-D race-fix 検証) | `cmd_list_widgets` race protection              |
| T2-2-5  | selection mode toggle → button text 変化           | UI のみ                                         |
| T2-2-6  | widget D&D で配置 → 永続化                         | `cmd_add_widget` + `cmd_update_widget_position` |
| T2-2-7  | widget 削除 + Undo                                 | `cmd_remove_widget` + history                   |
| T2-2-8  | item launch (Library click → 起動 IPC 成功)        | `cmd_launch_item`                               |
| T2-2-9  | search (debounce + fuzzy filter)                   | `cmd_search_items`                              |
| T2-2-10 | bulk star / delete (selection mode)                | `cmd_toggle_star` 多重                          |
| T2-2-11 | Palette open (Ctrl+Shift+Space) + Esc close        | hotkey listener                                 |
| T2-2-12 | Palette 検索 → Enter で launch                     | palette flow 完走                               |

実装位置: `tests/e2e/critical-path.spec.ts` + `critical-path-2.spec.ts`。

---

## T3: real bug regression + state store (5-12 件)

**目的**: 過去 user 検収で発見された既知 bug の再発防止 + state store の race / cache integrity 保証。

選定基準:

- 過去 PR で fix した bug のうち、 再発リスクが高いもの
- state store race / cache invalidation 系 (T4 から移管)

| ID   | regression                                    | 由来                                                       |
| ---- | --------------------------------------------- | ---------------------------------------------------------- |
| T3-1 | workspace 高速切替で widgets stale            | PR-D Codex must-fix #1 (loadWidgets race token protection) |
| T3-2 | workspace 切替後の undo 不整合                | PR-D Codex must-fix #2 (workspace-config history clear)    |
| T3-3 | metadataStore cache invalidation              | V6 (item 編集後の sidebar metadata 即時反映)               |
| T3-4 | selection actionbar sticky                    | PR-E2                                                      |
| T3-5 | widget delete 後の sidebar 件数 stale         | PR-D 系                                                    |
| T3-6 | EXE folder widget 削除時 Library item cascade | 2026-05-13 横展開漏れ fix (#443)                           |
| T3-7 | D&D widget 位置が画面外 (cluster anchor)      | 2026-05-13 fix (#443)                                      |
| T3-8 | image-scrap / file-preview D&D 重複検出       | 2026-05-12 fix (#440)                                      |

実装位置: `tests/e2e/regression.spec.ts` + `regression-2.spec.ts`。

### Dialog pin tests

| ID     | scenario                                                 | 由来                        |
| ------ | -------------------------------------------------------- | --------------------------- |
| T3-D-1 | ItemFormDialog open / Escape close / backdrop close      | refactor lock 用 dialog-pin |
| T3-D-2 | CardOverrideDialog (Library detail panel カード個別調整) | 同                          |
| T3-D-3 | WidgetSettingsDialog (Workspace widget 設定)             | 同                          |
| T3-D-4 | WorkspaceRenameDialog                                    | 同                          |
| T3-D-5 | WorkspaceWallpaperDialog                                 | 同                          |
| T3-D-6 | ConfirmDialog (Library item 削除 等)                     | 同                          |

実装位置: `tests/e2e/dialog-pin.spec.ts`。

---

## T4: core utility (vitest unit、 完了済)

**目的**: frontend の中核 pure utility が unit level で正しく動くことを保証。

実装済 (PR-Z2 #354 + PR-Z3 #355):

| spec                    | case 数 | 対象                                                                                      |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `fuzzy-search.test.ts`  | 12      | `fuzzyScore` / `fuzzyFilter`                                                              |
| `library-sort.test.ts`  | 7       | `sortItems` × {name / created / updated} × {asc / desc} + type guard                      |
| `widget-grid.test.ts`   | 18      | `wouldOverlapAt` / `findFreePosition` / `clampWidget` / `findFreePositionNear`            |
| `zoom-math.test.ts`     | 14      | `clampZoom` / `computeBoundingBox` / `computeOrigin` / `cellStrideX/Y` / `computeFitZoom` |
| `format-error.test.ts`  | 6       | `getErrorMessage` / `getErrorCode`                                                        |
| `format-target.test.ts` | 6       | URL hostname / Windows / Unix path / 末尾 separator                                       |

CI 完走時間: vitest **379ms** (8-10 min 想定の負荷ほぼゼロ)。

### T4 残 (低優先、 必要時に追加)

- `clampAnchor` / `computeZoomAnchorScroll` / `computeFitScroll` (使用箇所限定)

### T4 から移管された state store test → T3

state store test は mock (`workspaceIpc` / `itemsIpc` / `toastStore`) + jsdom が必要、 minimal essential 原則に反する複雑度のため、 **T3 regression に移管**。 e2e (T1/T2) で実機操作経由でカバーする方が user 体験に近く本筋。

---

## 進行 rule

- 各 PR で **5-15 件** ずつ test 追加 (PR-Z2、 PR-Z3、 ...)
- 1 phase 完了ごとに CI 完走時間を測定、 8-10 min 想定を超えそうなら scope 削減
- T1 → T2 → T3 → T4 の順 (依存)、 T4 (utility) は parallel で進めて OK
- 各 PR で agent 一次検証 (svelte-check / biome / Rust clippy / cargo test) + Codex review + user 検収
- branch 命名: `test-rebuild/<phase>-<topic>` (例: `test-rebuild/t1-smoke`)

### CI 完走時間目標

| stage                                                 | 想定時間                           |
| ----------------------------------------------------- | ---------------------------------- |
| changes filter                                        | 10s                                |
| check (svelte-check + Rust clippy + fmt + cargo test) | 5-7 min                            |
| build (vite production + Tauri bundle)                | 3-5 min                            |
| frontend test (T1+T2+T3+T4 完了時)                    | 2-3 min                            |
| **合計**                                              | **10-15 min** (build と並列実行可) |

---

## 完了 milestone

- **T1 完成**: smoke 5-10 件、 起動 + 主画面 + 基本 IPC pass を保証
- **T2 完成**: critical path 10-15 件、 daily-use の golden path 全 pass
- **T3 完成**: regression 5-10 件、 lessons.md 系 bug の再発防止
- **T4 完成**: ✓ core unit 完了済 (PR-Z2 + Z3)
- **全 T1-T4 完成**: refactor 後の test re-establishment 完遂、 CI 全 green

---

## tooling 詳細

### Tauri + WebView2 + Playwright + CDP attach

`playwright.config.ts` は globalSetup で Tauri debug binary 起動 + `cmd_mark_setup_complete` IPC 実行、 fixture (`tests/fixtures/tauri.ts`) で CDP attach + main webview page を取得。

```typescript
// tests/fixtures/tauri.ts (抜粋)
const port = process.env.ARCAGATE_TEST_CDP_PORT ?? '9515';
const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
const ctx = browser.contexts()[0];
const mainPage = ctx.pages().find((p) => /\/(\?|$)/.test(p.url())) ?? pages[0];
await mainPage.waitForURL(/^http:\/\/localhost:\d+\/?(\?.*)?$/);
await mainPage.waitForLoadState('domcontentloaded');
await mainPage.locator('main').first().waitFor({ state: 'visible' });
await markSetupComplete(mainPage);  // safe net、 deleteWorkspace 等で state が壊れた場合の保険
```

### 落とし穴

| 症状                               | 原因                                              | 対処                                                         |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| CDP 疎通後もページが `about:blank` | WebView2 初期化 timing                            | `page.waitForURL(/localhost:5173/)` を追加                   |
| IPC 後 UI 反映されない             | IPC 変更が Svelte ストアをバイパス                | `page.reload()` + `waitForLoadState`                         |
| Escape が届かない                  | palette input にフォーカス無し                    | `await input.focus()` 先に                                   |
| Windows でプロセスツリー残る       | `process.kill()` が subtree を残す                | `taskkill /PID /T /F`                                        |
| CI で Vite 起動 timeout            | cold start 遅い                                   | `webServer.timeout: 60_000`                                  |
| SetupWizard が click intercept     | 前 test で `delete_workspace` 等が state を壊した | fixture で毎 test `markSetupComplete` 呼ぶ (safe net 実装済) |

詳細は `.claude/skills/e2e-tauri-webview2/SKILL.md` 参照 (skill base directory)。

---

## 参照

- 全体アーキテクチャ → [`foundation.md`](./foundation.md)
- 画面別カタログ → [`screens/`](./screens/)
- 失敗駆動メモリ → [`./lessons.md`](./lessons.md)
- 製品要求 → [`../l0_ideas/motivation.md`](../l0_ideas/motivation.md)
