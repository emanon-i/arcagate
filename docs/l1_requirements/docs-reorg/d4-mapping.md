# D4': 既存 doc → 新 path mapping (Tri-SSD contract 準拠版)

**Status**: 2026-05-06 D3' 設計を既存 ~94 active に適用
**Method**: l0-l3 維持、`_archive/` rename、内部 sub-dir 整理

→ 削除は [d4-deletes.md](./d4-deletes.md)、実行は [d4-execution.md](./d4-execution.md) 参照。

## A. Top-level (`docs/*.md`、9 件) → l1 / 削除

| 既存 path                           | 新 path                                                      | action                                             |
| ----------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| `docs/SUPPORT.md`                   | `docs/l1_requirements/distribution/support.md`               | 移動 + kebab 化                                    |
| `docs/desktop_ui_ux_agent_rules.md` | `docs/l1_requirements/desktop-ui-rules.md`                   | 移動 + kebab + 分割 (537 → ≤200 × 4 part)          |
| `docs/dispatch-log.md`              | (削除)                                                       | 3628 行、git log で代替                            |
| `docs/dispatch-operation.md`        | `docs/l1_requirements/distribution/dispatch-rules.md`        | 移動 + kebab                                       |
| `docs/dispatch-queue.md`            | (削除)                                                       | TodoWrite で代替                                   |
| `docs/distribution-readiness.md`    | (削除)                                                       | distribution/microsoft-store と重複                |
| `docs/distribution-rollback-sop.md` | `docs/l1_requirements/distribution/distribution-rollback.md` | 移動 + kebab                                       |
| `docs/lessons.md`                   | `docs/lessons.md`                                            | そのまま (top-level live、plugin 範囲外、変更なし) |
| `docs/widget-add-checklist.md`      | `docs/l1_requirements/widget-add-checklist.md`               | 移動                                               |

## B. `docs/l0_ideas/` (md 4 + binary 4) → l0 内整理

| 既存 path                                  | 新 path                                      | action                                              |
| ------------------------------------------ | -------------------------------------------- | --------------------------------------------------- |
| `arcagate-concept.md` (314)                | `docs/l0_ideas/concept.md`                   | rename (kebab、prefix 排除) + 分割 (314 → ≤200 × 2) |
| `arcagate-engineering-principles.md` (226) | `docs/l0_ideas/engineering-principles.md`    | rename + trim (226 → ≤200)                          |
| `arcagate-visual-language.md` (198)        | `docs/l0_ideas/visual-language.md`           | rename                                              |
| `arcagate_mockup_board.jsx`                | `docs/l0_ideas/mockups/board.jsx`            | mockups/ sub-dir に集約                             |
| `overlay-palette-mock.png`                 | `docs/l0_ideas/mockups/overlay-palette.png`  | 移動                                                |
| `window-library-mock.png`                  | `docs/l0_ideas/mockups/window-library.png`   | 移動                                                |
| `window-workspace-mock.png`                | `docs/l0_ideas/mockups/window-workspace.png` | 移動                                                |
| `.gitkeep`                                 | (削除)                                       | 不要                                                |

`l0_ideas/` 中身は plugin 範囲外なので自由整理。`arcagate-` prefix は冗長 (dir 名で明白) → 排除。

## C. `docs/l1_requirements/` 直下 (6 件) → kebab 統一

| 既存 path                             | 新 path                                 | action                                                         |
| ------------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| `vision.md`                           | `docs/l1_requirements/vision.md`        | **canonical L1**、変更なし                                     |
| `use-cases.md`                        | `docs/l1_requirements/use-cases.md`     | そのまま (既に kebab)                                          |
| `ux_design_vision.md`                 | `docs/l0_ideas/ux-design.md`            | l0 へ寄せる (vision 系として) + rename + 分割 (242 → ≤200 × 2) |
| `ux_standards.md` (879)               | `docs/l1_requirements/ux-standards.md`  | rename + 分割 (≤200 × 6 part)                                  |
| `design_system_architecture.md` (283) | `docs/l1_requirements/design-system.md` | rename + 分割 (≤200 × 2)                                       |
| `.gitkeep`                            | (削除)                                  | 不要                                                           |

## D. `docs/l1_requirements/design/` (1 件) → l1 直下

| 既存 path                         | 新 path                                     | action                                          |
| --------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| `industrial-yellow-spec.md` (229) | `docs/l1_requirements/industrial-yellow.md` | 1 file dir 解消 + suffix 排除 + 分割 (≤200 × 2) |

## E. `docs/l1_requirements/distribution/` (R10) → そのまま、guide 系も統合

| 既存 path                              | 新 path                                                    | action                      |
| -------------------------------------- | ---------------------------------------------------------- | --------------------------- |
| `pubkey-procedure.md` (207)            | `docs/l1_requirements/distribution/pubkey-procedure.md`    | trim (207 → ≤200)           |
| `cosign-verification.md`               | `docs/l1_requirements/distribution/cosign-verification.md` | そのまま                    |
| `microsoft-store.md` (R10-Y、未 merge) | `docs/l1_requirements/distribution/microsoft-store.md`     | そのまま (PR #332 merge 後) |

R10 で作った `distribution/` を維持、top-level `docs/` から SUPPORT/dispatch/distribution-rollback も合流。

## F. `docs/l1_requirements/library-overhaul/` (12) → l3_phases/_archive/

L1-L3 完了済の overhaul、Tri-SSD canonical archive へ移動。

| 既存 path                      | 新 path                                                 | action                        |
| ------------------------------ | ------------------------------------------------------- | ----------------------------- |
| `decisions.md` (153)           | `docs/l3_phases/_archive/library-overhaul/decisions.md` | archive 移動                  |
| `design-direction.md` 他 11 件 | `docs/l3_phases/_archive/library-overhaul/*`            | archive 移動 (元 file 名保持) |
| `known-issues.md` (158)        | (削除)                                                  | lessons.md と重複領域         |

## G. `docs/l1_requirements/release-readiness/` (16 + sub 7 = 23) → 統合 + archive

| 既存 path                                                                                               | 新 path                                                                       | action                                               |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `criteria.md` + `criteria-error-distribution.md` + `criteria-quality.md` + `criteria-stability-perf.md` | `docs/l1_requirements/release-criteria.md` (+ -error / -quality / -stability) | 統合 (l1 直下、各 ≤200)                              |
| `audit-final-r6.md` 〜 `audit-final-r10.md` 等 9 件                                                     | `docs/l3_phases/_archive/release-readiness/*`                                 | archive 移動                                         |
| `gap-list.md` / `lessons-test-cross-reference.md`                                                       | `docs/l3_phases/_archive/release-readiness/*`                                 | archive                                              |
| `user-action-needed.md` (110)                                                                           | `docs/l1_requirements/distribution/user-action-needed.md`                     | distribution/ 配下へ (live、minisign / MSStore 待ち) |
| `auto-checks/README.md`                                                                                 | (削除)                                                                        | CI yml と重複                                        |
| `measurements/*.md` (6 件)                                                                              | `docs/l3_phases/_archive/release-readiness/measurements/*`                    | archive                                              |

## H. `docs/l1_requirements/ux-research/` (8) → l3_phases/_archive/

| 既存 path                                                                                   | 新 path                                 | action                                                                          |
| ------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| `cedec-papers.md` / `claude-skills-survey.md` / `industry-standards.md` / `codex-review.md` | `docs/l3_phases/_archive/ux-research/*` | archive (industry-standards のみ live で残す案あるが、参照頻度低なので archive) |
| `codex-review-batch-92/95/101/106.md` (4 件)                                                | (削除)                                  | snapshot、git log で代替                                                        |

## I. `docs/l1_requirements/workspace-canvas-rewrite/` (14) → l3_phases/_archive/

phase1 完了済、全件 archive。

| 既存 path                                                                       | 新 path                                              | action       |
| ------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------ |
| `phase1-investigation*.md` 7 件 / `phase1-plan*.md` 5 件 / `phase1.1-*.md` 2 件 | `docs/l3_phases/_archive/workspace-canvas-rewrite/*` | archive 移動 |

## J. `docs/l2_architecture/` (15) → l2_architecture/_archive/ + 一部 live

`l2_architecture/` dir 自体は plugin 範囲外で残せる。snapshot 系は内部 archive、live は残す。

| 既存 path                                                                                                          | 新 path                                                 | action                   |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------ |
| `folder-map.md` (156)                                                                                              | `docs/l2_architecture/folder-map.md`                    | live、そのまま           |
| `frontend-backend-split.md`                                                                                        | `docs/l2_architecture/frontend-backend-split.md`        | live                     |
| `bundle-baseline.md` / `complexity-baseline.md` / `performance-baseline.md` (369) / `metrics-report.md`            | `docs/l2_architecture/_archive/baselines/*`             | snapshot archive         |
| `component-graph.md` / `module-graph.md` / `dependency-quality.md`                                                 | `docs/l2_architecture/_archive/*`                       | archive                  |
| `use-case-friction-v2.md` (500)                                                                                    | `docs/l2_architecture/_archive/use-case-friction-v2.md` | archive                  |
| `use-case-friction.md` (v1)                                                                                        | (削除)                                                  | v2 で superseded         |
| `cleanup-candidates.md` / `codex-review-2026-04-25.md` / `polish-era-progress.md` / `refactoring-opportunities.md` | (削除)                                                  | snapshot、git log で代替 |

## K. `docs/l2_foundation/` → そのまま

| 既存 path             | 新 path                            | action                                                                                                                                            |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foundation.md` (834) | `docs/l2_foundation/foundation.md` | **canonical L2**、path 維持。内容を overview (≤200) に絞り、詳細は `foundation-architecture.md` / `foundation-schema.md` 等 partner file に逃がす |
| `.gitkeep`            | (削除)                             | 不要                                                                                                                                              |

## L. `docs/l3_phases/` → archive を _archive にrename

| 既存 path                     | 新 path                                      | action                                                    |
| ----------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `_template/use-case-audit.md` | `docs/l3_phases/_template/use-case-audit.md` | そのまま                                                  |
| `archive/` (503 件)           | `docs/l3_phases/_archive/`                   | **dir rename** (Tri-SSD contract: `_archive/` underscore) |
| 内部 PH-* 命名                | 維持                                         | Tri-SSD glob 互換                                         |

## M. `docs/archive/` (3) → 削除

| 既存 path                                       | action             |
| ----------------------------------------------- | ------------------ |
| `arcagate-engineering-principles-historical.md` | 削除 (live で十分) |
| `dispatch-operation-historical.md`              | 削除               |
| `lessons-historical.md`                         | 削除               |

`docs/archive/` dir 自体も削除。

## N. 新規作成

| 新 path                    | 内容                                                        |
| -------------------------- | ----------------------------------------------------------- |
| `docs/llms.txt`            | root index、agent navigation (Tri-SSD canonical を最優先で) |
| `docs/README.md`           | human entrypoint、5 分割 (l0/l1/l2/l3/lessons)              |
| `docs/l3_phases/README.md` | Tri-SSD lifecycle ガイド                                    |

## サマリ

| action                                                              | 件数                                                                                                       |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| canonical 維持 (vision.md / foundation.md)                          | 2                                                                                                          |
| 移動のみ (kebab 化 + path 整理)                                     | ~30                                                                                                        |
| 移動 + 分割 (200 行超え対応)                                        | 7 (ux-standards / desktop-ui-rules / concept / design-system / industrial-yellow / ux-design / foundation) |
| 統合                                                                | 1 (criteria 4 件 → release-criteria + 派生)                                                                |
| archive 移動 (`l3_phases/_archive/` か `l2_architecture/_archive/`) | ~70                                                                                                        |
| **削除**                                                            | ~16 (重複 / snapshot / outdated)                                                                           |
| 新規                                                                | 3 (llms.txt / README × 2)                                                                                  |
| dir rename                                                          | 1 (`l3_phases/archive/` → `l3_phases/_archive/`)                                                           |

D4' 完了。D4-deletes / D4-execution は本書を前提に書き直す。
