# Test Rebuild Plan (T1-T4)

PR-Z で frontend test 全削除後、新 architecture (PR-A〜PR-H 完了状態) の上に **minimal essential test** を新規 design・incremental に再構築する plan。

## 背景

### refactor 期間の経緯

- **PR-A1〜PR-H** で V1-V10 violation 解消、main の architecture が大幅に変化
- 旧 test (frontend vitest 35 + e2e 43) は refactor 中に大半が壊れる想定で、`refactor/*` branch では test gate を auto-skip して進行
- refactor 完了時点で「壊れた古い test を fix forward する」より「**全削除して必要十分のみ再構築**」が user 判断

### PR-Z で実施済 (2026-05-06)

- `tests/` (e2e + fixtures + helpers、43 file) 全削除
- `src/**/*.test.ts` (vitest unit、35 file) 全削除
- `vitest.config.ts` / `playwright.config.ts` 削除
- `package.json` から test scripts + vitest / playwright dev deps 削除
- `.github/workflows/e2e.yml` / `e2e-nightly.yml` 削除
- `.github/workflows/ci.yml` の Vitest step 削除 + refactor branch test gate skip 解除
- `CLAUDE.md` Branch convention を「過去形化」(refactor 期間終了 mark)
- **Rust inline test (`#[cfg(test)]`、39 file) は維持** (migration safety / build correctness)

## 原則

> **minimal essential、necessary and sufficient**

- 過剰 coverage を狙わない (refactor 中に壊れない最小集合)
- 各 test は **明確な目的** を持つ (smoke / critical path / real bug regression / core IPC)
- 「念のため」 test は書かない (LOC の浪費)
- CI 全完走 **8-10 min** 想定 (現実装の build + check + Rust test で ~5-7 min、+frontend test 2-3 min)

## phase 構成 (T1-T4)

| phase  | scope                                                                             | target 件数 | 主な test 種別            | tooling             |
| ------ | --------------------------------------------------------------------------------- | ----------- | ------------------------- | ------------------- |
| **T1** | smoke (起動・主画面 render・基本 IPC pass)                                        | 5-10        | e2e 主体                  | playwright          |
| **T2** | critical path (item CRUD / workspace switch / widget D&D / launch)                | 10-15       | e2e + 必要最低限の vitest | playwright + vitest |
| **T3** | real bug regression (過去 fix の再発防止、特に lessons.md 系)                     | 5-10        | e2e or vitest             | 用途次第            |
| **T4** | core IPC / state / utility (frontend store の race protection、format helpers 等) | 10-15       | vitest 主体               | vitest              |

合計 **30-50 test** 想定。Rust inline test (39 件、維持) と合わせて **~70-90 test** が CI で実行される。

## phase 詳細

### T1: smoke (5-10 件)

**目的**: アプリが起動して主画面が render されること、基本 IPC が pass することを保証。**stale な regression を即座に検出**する garde-fou。

**含めるもの**:

- アプリ起動 → workspace 画面が render されること
- アプリ起動 → library 画面が render されること
- アプリ起動 → settings 画面が render されること
- 基本 IPC: `listWorkspaces` / `listItems` / `listOpeners` 等が成功 response を返す
- palette open (Ctrl+Shift+Space hotkey)

**含めないもの**: 個別機能の詳細動作 (T2 で扱う)

### T2: critical path (10-15 件)

**目的**: ユーザーが日常的に使う **golden path** が壊れていないことを保証。

**含めるもの**:

- item 追加 (DropZone / form 入力 / submit) → library に表示
- item 編集 (label / target 変更) → 反映
- item 削除 + Undo
- workspace 切替 → widgets が正しく切替 (PR-D race-fix 検証)
- widget D&D で配置 → 永続化
- widget 削除 + Undo
- launch (item を click → 起動 IPC 成功)
- search (debounce + fuzzy filter)
- selection mode + bulk star / delete

**含めないもの**: 細かい UX (透明度 / hover state 等は T3 でのみ拾う)

### T3: real bug regression + state store (5-12 件)

**目的**: 過去に user 検収で発見された **既知 bug** の再発防止 + state store の race / cache integrity 保証。

**選定基準**:

- 過去 PR で fix した bug のうち、再発リスクが高いもの
- 例: PR-D race condition (workspace 切替で widgets stale)、PR-E2 selection actionbar sticky、widget delete 後の sidebar 件数 stale
- 該当 bug を再現する **最小限の e2e or vitest scenario**

**T4 から移管された state store test (T4 closing 判断)**:

- `workspace-widgets.loadWidgets` request token race protection (PR-D Codex must-fix #1) — e2e で workspace 高速切替シナリオ
- `workspace-config.selectWorkspace` history clear (PR-D Codex must-fix #2) — e2e で workspace 切替後の undo 不整合シナリオ
- `workspace-widgets.moveWidget` rollback の lost-update 防止 (PR-D Codex must-fix #3) — e2e で network throttling 経由
- `metadataStore` cache invalidation (V6) — e2e で item 編集後の sidebar metadata 即時反映

### T4: core utility (utility のみ、6 file / 63 件) ✅ 完了

**目的**: frontend の中核 pure utility が unit level で正しく動くことを保証。

**実装済 (PR-Z2 #354 + PR-Z3 #355)**:

- `fuzzy-search.test.ts` (12 case): fuzzyScore + fuzzyFilter
- `library-sort.test.ts` (7 case): sortItems × {name/created/updated} × {asc/desc} + type guard
- `widget-grid.test.ts` (18 case): wouldOverlapAt + findFreePosition + clampWidget + findFreePositionNear
- `zoom-math.test.ts` (14 case): clampZoom + computeBoundingBox + computeOrigin + cellStrideX/Y + computeFitZoom
- `format-error.test.ts` (6 case): getErrorMessage + getErrorCode
- `format-target.test.ts` (6 case): URL hostname / Windows / Unix path / 末尾 separator

CI 完走時間: vitest **379ms** (8-10 min 想定の負荷ほぼゼロ)。

**scope 修正 (T4 着手時の agent judgment)**:

旧 plan は state store も T4 に含めていたが、以下の理由で **T3 regression に移管**:

- state store test は **mock (workspaceIpc / itemsIpc / toastStore) + jsdom** が必要、minimal essential 原則に反する複雑度
- workspace-widgets race-fix (PR-D Codex must-fix #1-3) / metadataStore invalidation 等は **過去 bug の re-introduction 防止** = T3 regression test 領域
- e2e (T1/T2) で実機操作経由でカバーする方が user 体験に近く本筋

**T4 残 (低優先、必要時に追加)**: clampAnchor / computeZoomAnchorScroll / computeFitScroll は使用箇所限定、後続必要時に追加。

**含めないもの**: component 単体 test (T1/T2 の e2e でカバー、コスト/価値が低い)、state store mock test (T3 regression に移管)

## 進行ルール

- 各 PR で **5-15 件** ずつ test を追加 (PR-Z2, PR-Z3, ...)
- 1 phase 完了ごとに CI 完走時間を測定し、8-10 min 想定を超えそうなら scope 削減
- T1 → T2 → T3 → T4 の順 (依存関係)、ただし T4 (utility) は parallel で進めても OK
- 各 PR で agent 一次検証 (svelte-check / biome / Rust clippy / cargo test) + Codex review + user 検収
- branch 命名: `test-rebuild/<phase>-<topic>` (例: `test-rebuild/t1-smoke`)

## CI 完走時間目標

| stage                                                 | 想定時間                           |
| ----------------------------------------------------- | ---------------------------------- |
| changes filter                                        | 10s                                |
| check (svelte-check + Rust clippy + fmt + cargo test) | 5-7 min                            |
| build (vite production + Tauri bundle)                | 3-5 min                            |
| frontend test (T1+T2+T3+T4 完了時)                    | 2-3 min                            |
| **合計**                                              | **10-15 min** (build と並列実行可) |

## 完了 milestone

- T1 完成: smoke 5-10 件、起動 + 主画面 + 基本 IPC pass を保証
- T2 完成: critical path 10-15 件、daily-use の golden path 全 pass
- T3 完成: regression 5-10 件、lessons.md 系 bug の再発防止
- T4 完成: core unit 10-15 件、store + utility 全 pass
- **全 T1-T4 完成**: refactor 後の test re-establishment 完遂、CI 全 green の status
