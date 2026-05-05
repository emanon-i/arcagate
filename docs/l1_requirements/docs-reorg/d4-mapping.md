# D4: 既存 doc → 新階層 mapping 表

**Status**: 2026-05-06 D3 設計を既存 ~94 active + ~506 archive に適用
**Method**: D1 inventory を D3 階層 (vision/spec/guide/adr/plans) に振り分け

→ 削除対象は [d4-deletes.md](./d4-deletes.md)、実行手順は [d4-execution.md](./d4-execution.md) 参照。

## A. Top-level (`docs/*.md`、9 件)

| 既存 path                           | 新 path                                        | action                                |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------- |
| `docs/SUPPORT.md`                   | `docs/guide/support.md`                        | 移動 + 命名 (大文字 → kebab)          |
| `docs/desktop_ui_ux_agent_rules.md` | `docs/spec/desktop-ui-rules.md`                | 移動 + 命名 + **要分割 (537 → ≤200)** |
| `docs/dispatch-log.md`              | (削除)                                         | 3628 行、live 不要、git 履歴に逃がす  |
| `docs/dispatch-operation.md`        | `docs/guide/dispatch-rules.md`                 | 移動 + 命名                           |
| `docs/dispatch-queue.md`            | (削除)                                         | 45 行、操作中 queue は実装で表現済    |
| `docs/distribution-readiness.md`    | (削除、内容は guide/microsoft-store.md と重複) | D1 痛み 3                             |
| `docs/distribution-rollback-sop.md` | `docs/guide/distribution-rollback.md`          | 移動 + 命名                           |
| `docs/lessons.md`                   | `docs/lessons.md`                              | そのまま (live、git 履歴で歴史追える) |
| `docs/widget-add-checklist.md`      | `docs/spec/widget-add-checklist.md`            | 移動のみ                              |

## B. `docs/l0_ideas/` (md 4 + binary 4、計 8 件)

| 既存 path                            | 新 path                                 | action                                  |
| ------------------------------------ | --------------------------------------- | --------------------------------------- |
| `arcagate-concept.md`                | `docs/vision/concept.md`                | 移動 + 命名                             |
| `arcagate-engineering-principles.md` | `docs/vision/engineering-principles.md` | 移動 + 命名                             |
| `arcagate-visual-language.md`        | `docs/vision/visual-language.md`        | 移動 + 命名                             |
| `arcagate_mockup_board.jsx`          | `assets/mockups/board.jsx`              | 移動 (docs 範囲外、`vision/` から link) |
| `overlay-palette-mock.png`           | `assets/mockups/overlay-palette.png`    | 移動                                    |
| `window-library-mock.png`            | `assets/mockups/window-library.png`     | 移動                                    |
| `window-workspace-mock.png`          | `assets/mockups/window-workspace.png`   | 移動                                    |
| `.gitkeep`                           | (削除)                                  | 不要                                    |

## C. `docs/l1_requirements/` 直下 (6 件)

| 既存 path                       | 新 path                      | action                                |
| ------------------------------- | ---------------------------- | ------------------------------------- |
| `vision.md`                     | `docs/vision/product.md`     | 移動 + 命名 (vision 領域を l0 と統合) |
| `use-cases.md`                  | `docs/vision/use-cases.md`   | 移動                                  |
| `ux_design_vision.md`           | `docs/vision/ux-design.md`   | 移動 + 命名                           |
| `ux_standards.md`               | `docs/spec/ux-standards.md`  | 移動 + **要分割 (879 → ≤200 × 数本)** |
| `design_system_architecture.md` | `docs/spec/design-system.md` | 移動 + 命名                           |
| `.gitkeep`                      | (削除)                       | 不要                                  |

## D. `docs/l1_requirements/design/` (1 件)

| 既存 path                   | 新 path                          | action                           |
| --------------------------- | -------------------------------- | -------------------------------- |
| `industrial-yellow-spec.md` | `docs/spec/industrial-yellow.md` | 移動 + 命名 (要分割: 229 → ≤200) |

## E. `docs/l1_requirements/distribution/` (2 件、R10 で作成)

| 既存 path                                         | 新 path                             | action                    |
| ------------------------------------------------- | ----------------------------------- | ------------------------- |
| `pubkey-procedure.md`                             | `docs/guide/pubkey-procedure.md`    | 移動 (要分割: 207 → ≤200) |
| `cosign-verification.md`                          | `docs/guide/cosign-verification.md` | 移動                      |
| `microsoft-store.md` (R10-Y で作成、まだ未 merge) | `docs/guide/microsoft-store.md`     | 移動                      |

## F. `docs/l1_requirements/library-overhaul/` (12 件)

phase L1〜L3 完了済の overhaul plan、archive 行き候補。

| 既存 path                                                                      | 新 path                                                      | action                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------- |
| `decisions.md` (153 行、L3 で更新)                                             | `docs/adr/0010-library-overhaul-decisions.md`                | 移動 + ADR 化                                             |
| `design-direction.md`                                                          | `docs/plans/archive/library-overhaul/design-direction.md`    | archive 移動                                              |
| `industry-comparison.md`                                                       | `docs/plans/archive/library-overhaul/industry-comparison.md` | archive 移動                                              |
| `inventory-1-files.md` / `inventory-2-data-flow.md`                            | `docs/plans/archive/library-overhaul/`                       | archive 移動                                              |
| `investigation.md`                                                             | `docs/plans/archive/library-overhaul/investigation.md`       | archive 移動                                              |
| `known-issues.md` (158 行)                                                     | (削除)                                                       | lessons.md と重複領域、live で必要なら lessons へ取り込み |
| `phase-l1-plan.md` / `phase-l2-plan.md` / `phase-l3-plan.md` / `phase-plan.md` | `docs/plans/archive/library-overhaul/`                       | archive 移動                                              |
| `ux-gaps.md`                                                                   | `docs/plans/archive/library-overhaul/ux-gaps.md`             | archive 移動                                              |

## G. `docs/l1_requirements/release-readiness/` (16 + sub 7 = 23 件)

R10 で完了 audit cycle、live は最新 1 件のみ、過去 rN は archive。

| 既存 path                                                                                               | 新 path                                                                | action                               |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `criteria.md` + `criteria-error-distribution.md` + `criteria-quality.md` + `criteria-stability-perf.md` | `docs/spec/release-criteria.md` (統合、要分割 if 200 超え)             | 統合                                 |
| `audit-final-r10.md` (162 行)                                                                           | `docs/plans/archive/release-readiness/audit-final-r10.md`              | archive 移動 (R10 で完了、live 不要) |
| `audit-final-r6.md` / `r7.md` / `r8.md` / `audit-final.md`                                              | `docs/plans/archive/release-readiness/`                                | archive 移動                         |
| `audit-error-distribution.md` / `audit-quality.md` / `audit-stability-perf.md` / `audit.md`             | `docs/plans/archive/release-readiness/`                                | archive 移動                         |
| `gap-list.md`                                                                                           | `docs/plans/archive/release-readiness/gap-list.md`                     | archive 移動                         |
| `lessons-test-cross-reference.md`                                                                       | `docs/plans/archive/release-readiness/lessons-test-cross-reference.md` | archive 移動                         |
| `user-action-needed.md`                                                                                 | `docs/guide/user-action-needed.md`                                     | 移動 (live、minisign/MSStore 待ち)   |
| `auto-checks/README.md`                                                                                 | (削除)                                                                 | 58 行、内容は CI yml と重複          |
| `measurements/*.md` (6 件)                                                                              | `docs/plans/archive/release-readiness/measurements/`                   | archive 移動 (snapshot 系)           |

## H. `docs/l1_requirements/ux-research/` (8 件)

外部 research / codex review snapshot、archive 行き。

| 既存 path                        | 新 path                                                  | action                                       |
| -------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| `cedec-papers.md`                | `docs/plans/archive/ux-research/cedec-papers.md`         | archive 移動                                 |
| `claude-skills-survey.md`        | `docs/plans/archive/ux-research/claude-skills-survey.md` | archive 移動                                 |
| `codex-review-batch-*.md` (4 件) | (削除)                                                   | batch ごとの review snapshot、git 履歴で代替 |
| `codex-review.md`                | `docs/plans/archive/ux-research/codex-review.md`         | archive 移動 (concat 版)                     |
| `industry-standards.md`          | `docs/spec/industry-standards.md`                        | live spec 化                                 |

## I. `docs/l1_requirements/workspace-canvas-rewrite/` (14 件)

完了済 phase 1 / 1.1、全件 archive。

| 既存 path                                                    | 新 path                                        | action       |
| ------------------------------------------------------------ | ---------------------------------------------- | ------------ |
| `phase1-investigation*.md` (7 件)                            | `docs/plans/archive/workspace-canvas-rewrite/` | archive 移動 |
| `phase1-plan*.md` (5 件)                                     | `docs/plans/archive/workspace-canvas-rewrite/` | archive 移動 |
| `phase1.1-plan.md` / `phase1.1-zoom-anchor-investigation.md` | `docs/plans/archive/workspace-canvas-rewrite/` | archive 移動 |

## J. `docs/l2_architecture/` (15 件)

snapshot / metrics 系、live と archive 混在を整理。

| 既存 path                                                                         | 新 path                                                                                    | action                                 |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| `bundle-baseline.md` / `complexity-baseline.md` / `performance-baseline.md` (369) | `docs/plans/archive/baselines/`                                                            | archive (baseline は時点 snapshot)     |
| `cleanup-candidates.md` (28 行)                                                   | (削除)                                                                                     | 28 行、内容は plans/active で持つ      |
| `codex-review-2026-04-25.md`                                                      | (削除)                                                                                     | snapshot、git 履歴で代替               |
| `component-graph.md` / `module-graph.md` / `dependency-quality.md`                | `docs/plans/archive/architecture-analysis/`                                                | archive                                |
| `folder-map.md` (156 行)                                                          | `docs/spec/folder-map.md`                                                                  | live 化 (構造 reference)               |
| `frontend-backend-split.md`                                                       | `docs/spec/frontend-backend-split.md`                                                      | live 化 (architecture reference)       |
| `metrics-report.md`                                                               | `docs/plans/archive/baselines/metrics-report.md`                                           | archive                                |
| `polish-era-progress.md`                                                          | (削除)                                                                                     | 58 行、R10 完了後 stale                |
| `refactoring-opportunities.md` (215 行)                                           | (削除)                                                                                     | live spec とせず、phase 着手時に再生成 |
| `use-case-friction.md` / `use-case-friction-v2.md` (500)                          | `docs/plans/archive/architecture-analysis/use-case-friction-v2.md` のみ archive、v1 は削除 | v1 を削除し v2 のみ archive            |

## K. `docs/l2_foundation/` (1 件)

`foundation.md` (834 行、巨大) → 内容調査して spec / adr に解体。

| 既存 path       | 新 path         | action                                                                             |
| --------------- | --------------- | ---------------------------------------------------------------------------------- |
| `foundation.md` | (D5 で内容精査) | 解体 → `docs/spec/` 数本 + 重要決定は `docs/adr/` 化、reference 価値ない部分は削除 |

## L. `docs/l3_phases/` (template + archive 503 件)

| 既存 path                     | 新 path                             | action                                    |
| ----------------------------- | ----------------------------------- | ----------------------------------------- |
| `_template/use-case-audit.md` | `docs/plans/_template.md`           | 移動 (template として保持)                |
| `archive/*` (503 件)          | `docs/plans/archive/legacy-phases/` | 全件 移動 (PH-NNN 命名は保持で grep 互換) |

## M. `docs/archive/` (3 件)

| 既存 path                                       | 新 path | action                                                           |
| ----------------------------------------------- | ------- | ---------------------------------------------------------------- |
| `arcagate-engineering-principles-historical.md` | (削除)  | live `vision/engineering-principles.md` で十分、git で履歴追える |
| `dispatch-operation-historical.md`              | (削除)  | 同上                                                             |
| `lessons-historical.md`                         | (削除)  | 同上                                                             |

## N. 新規作成 (D5 で生成)

| 新 path                                     | 内容                                             |
| ------------------------------------------- | ------------------------------------------------ |
| `docs/llms.txt`                             | root index、agent navigation                     |
| `docs/README.md`                            | human entrypoint、5 type 説明 + llms.txt link    |
| `docs/adr/README.md`                        | ADR運用ルール (連番 / append-only / status enum) |
| `docs/adr/0001-tauri-v2-svelte5.md`         | retro ADR                                        |
| `docs/adr/0002-mutex-connection-no-pool.md` | retro ADR                                        |
| `docs/adr/0003-no-orm-rusqlite.md`          | retro ADR                                        |
| `docs/adr/0004-forward-only-migrations.md`  | retro ADR                                        |
| `docs/adr/0005-tier1-tier2-signing.md`      | R10 で確定した minisign + cosign 戦略            |
| `docs/plans/README.md`                      | active / archive 運用ルール                      |

## サマリ

| action                          | 件数                                      |
| ------------------------------- | ----------------------------------------- |
| 移動のみ (path 変更)            | ~30                                       |
| 移動 + 命名修正                 | ~20                                       |
| 移動 + **要分割 (200 行 超え)** | 5                                         |
| 統合 (複数 → 1)                 | 4 (criteria 4 → 1)                        |
| archive 移動                    | ~70 (live → plans/archive)                |
| **削除**                        | ~15 (重複 / snapshot / stale、git で代替) |
| 新規作成                        | 9 (llms.txt / README × 3 / ADR × 5)       |

D5 の commit 単位は section 順 (A → N) で 14 commit 程度を想定。
