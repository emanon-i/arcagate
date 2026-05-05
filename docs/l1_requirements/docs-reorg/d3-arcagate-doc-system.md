# D3': Arcagate doc system 設計 (Tri-SSD contract 準拠版)

**Status**: 2026-05-06 D3 完全書き直し (前回 D3 は l0-l3 を破壊する設計、`d3-tri-sdd-contract.md` で revert 必須と判明)
**前提**: `d3-tri-sdd-contract.md` の 9 必須項目を **絶対に守る**

→ 旧 D3 (vision/spec/guide/adr/plans 5 type) は **破棄**。本書が D3' final。

## 1. 設計原則 (再確認)

| 原則                         | 由来                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tri-SSD contract 厳守**    | l0_ideas/ / l1_requirements/ / l2_foundation/ / l3_phases/ の 4 dir + canonical files (vision.md / foundation.md / PH-*.md) は **絶対に動かさない** |
| **agent context 節約最優先** | 1 file 200-400 行推奨 (tri-ssd 推奨と整合)、CLAUDE.md は薄く / 詳細は on-demand                                                                     |
| **kebab-case 統一**          | snake_case / 大文字 / 日付 prefix を排除 (l0-l3 prefix は除外、それだけは contract)                                                                 |
| **重複 / outdated 排除**     | agent 混乱の元、削除 (git history で復元) or archive                                                                                                |
| **broken link 禁止**         | active 領域 (live doc) からの dead link は agent navigation を破壊                                                                                  |

## 2. 階層構造 (Tri-SSD 4 階層 を **保ったまま整理**)

```
docs/
├── README.md                       ← 新規: human entrypoint
├── llms.txt                        ← 新規: agent 一発取得 index
├── lessons.md                      ← live (top-level、plugin 範囲外)
│
├── l0_ideas/                       ← Tri-SSD canonical、変更禁止
│   ├── concept.md                  ← 旧 arcagate-concept.md
│   ├── engineering-principles.md   ← 旧 arcagate-engineering-principles.md
│   ├── visual-language.md          ← 旧 arcagate-visual-language.md
│   ├── ux-design.md                ← 旧 ../l1_requirements/ux_design_vision.md (vision 系は l0 へ寄せる)
│   └── mockups/                    ← 旧 mock PNG / JSX (binary は dir 整理)
│       ├── overlay-palette.png
│       ├── window-library.png
│       ├── window-workspace.png
│       └── board.jsx
│
├── l1_requirements/                ← Tri-SSD canonical
│   ├── vision.md                   ← Tri-SSD canonical L1、移動禁止 (旧 vision.md 保持)
│   ├── use-cases.md                ← 旧 use-cases.md (l1 直下)
│   ├── ux-standards.md             ← 旧 ux_standards.md (rename only、内容は分割対応 spec/ へ)
│   ├── design-system.md            ← 旧 design_system_architecture.md (rename only)
│   ├── industrial-yellow.md        ← 旧 design/industrial-yellow-spec.md (rename + parent dir 解消)
│   ├── desktop-ui-rules.md         ← 旧 ../desktop_ui_ux_agent_rules.md (top-level → l1 spec 化)
│   ├── widget-add-checklist.md     ← 旧 ../widget-add-checklist.md (top-level → l1 spec)
│   ├── release-criteria.md         ← 旧 release-readiness/criteria*.md 4 件統合
│   ├── distribution/               ← guide 群 (sub-dir、plugin 範囲外なので自由)
│   │   ├── pubkey-procedure.md     ← R10-X
│   │   ├── cosign-verification.md  ← R10-X
│   │   ├── microsoft-store.md      ← R10-Y
│   │   ├── distribution-rollback.md ← 旧 ../distribution-rollback-sop.md
│   │   ├── support.md              ← 旧 ../SUPPORT.md
│   │   ├── dispatch-rules.md       ← 旧 ../dispatch-operation.md
│   │   └── user-action-needed.md   ← 旧 release-readiness/user-action-needed.md
│   └── docs-reorg/                 ← 本 reorg phase (PR merge 後 archive へ)
│
├── l2_foundation/                  ← Tri-SSD canonical
│   └── foundation.md               ← Tri-SSD canonical L2、移動禁止 (旧 foundation.md 保持)
│
├── l2_architecture/                ← plugin 範囲外、live spec として残す
│   ├── folder-map.md               ← live
│   ├── frontend-backend-split.md   ← live
│   └── _archive/                   ← snapshot 系 (baseline / metrics / use-case-friction-v2)
│
└── l3_phases/                      ← Tri-SSD canonical
    ├── _template/
    │   └── use-case-audit.md
    └── _archive/                   ← Tri-SSD contract: archive/ ではなく _archive/ に rename
        ├── PH-NNNN_*.md (legacy 503 件)
        ├── library-overhaul/       ← 旧 ../l1_requirements/library-overhaul/ 全件
        ├── workspace-canvas-rewrite/  ← 旧 ../l1_requirements/workspace-canvas-rewrite/ 全件
        ├── release-readiness/      ← 旧 ../l1_requirements/release-readiness/ の audit-final-rN 等
        └── docs-reorg/             ← 本 reorg PR merge 後の最終置き場
```

**重要**: `l3_phases/archive/` は現状 underscore なし。Tri-SSD contract に合わせ `_archive/` に rename する。

## 3. 命名規則

| 種別                 | pattern                 | 例                                                                     | 既存からの変更              |
| -------------------- | ----------------------- | ---------------------------------------------------------------------- | --------------------------- |
| canonical files      | path 固定               | `l1_requirements/vision.md`                                            | 維持                        |
| Tri-SSD ID 連番      | `PH-NNNN_kebab-case.md` | `PH-0001_mvp.md`                                                       | 維持                        |
| 通常 doc (内部)      | kebab-case              | `pubkey-procedure.md`                                                  | snake_case → kebab          |
| 大文字 file          | kebab-case              | `support.md`                                                           | `SUPPORT.md` → `support.md` |
| 旧式 docs/ 直下 misc | l1 / l2 sub に移動      | `desktop_ui_ux_agent_rules.md` → `l1_requirements/desktop-ui-rules.md` | 移動 + rename               |

**禁止**: snake_case (`ux_standards.md` → `ux-standards.md`)、大文字 (`SUPPORT.md` → `support.md`)、`docs/distribution-readiness.md` 等の中身重複 path

**例外**: `l0_ideas/` `l1_requirements/` `l2_foundation/` `l3_phases/` の **4 dir 名は snake_case で固定** (Tri-SSD contract)、変更禁止。`_archive/` `_template/` の underscore prefix も同様。

## 4. agent navigation (CLAUDE.md + llms.txt)

### CLAUDE.md (薄く保つ、context auto-load 制約)

```markdown
| 状況                      | 読む doc                                                     |
| ------------------------- | ------------------------------------------------------------ |
| 全体 index (LLM 一発取得) | docs/llms.txt                                                |
| プロダクト方針 / 哲学     | docs/l0_ideas/concept.md / engineering-principles.md         |
| 要件 (Tri-SSD L1)         | docs/l1_requirements/vision.md                               |
| システム構成 (Tri-SSD L2) | docs/l2_foundation/foundation.md                             |
| UI / 視覚 / レイアウト    | docs/l1_requirements/ux-standards.md / desktop-ui-rules.md   |
| テーマ / トークン         | docs/l1_requirements/design-system.md / industrial-yellow.md |
| Release criteria          | docs/l1_requirements/release-criteria.md                     |
| Distribution 手順         | docs/l1_requirements/distribution/                           |
| 過去の失敗                | docs/lessons.md                                              |
| 古い retrospective        | docs/l3_phases/_archive/ (Tri-SSD canonical archive)         |
| 着手中 plan               | docs/l1_requirements/<topic>/ (sub-dir で active 保持)       |
```

### llms.txt (root index)

agent が一発取得して全 doc を navigate するための flat list。各 entry に 1 行説明 + path。Tri-SSD canonical (vision.md / foundation.md / l3_phases) を最優先で示す。

## 5. lifecycle

### Tri-SSD canonical (vision.md / foundation.md)

- **append-only に近い update**、live で更新、削除 / 移動禁止

### l3_phases/PH-NNNN_*.md

- 実装中 = `l3_phases/PH-NNNN_*.md` で live
- 実装完了 = `/archive-l3` で `l3_phases/_archive/` へ移動 (plugin が自動)

### sub-dir plan (例: `l1_requirements/library-overhaul/`)

- 着手中 = `l1_requirements/<topic>/` で live
- 完了 = `l3_phases/_archive/<topic>/` へ手動移動 (Tri-SSD canonical archive を活用)
- 不要 = 削除 (git history で復元)

## 6. 200 行制約への対応 (Tri-SSD 推奨と整合)

```
ux-standards.md (879) → l1_requirements/ux-standards.md (200) + ux-standards-part-2.md...part-6.md
desktop-ui-rules.md (537) → main + part-2..part-4
foundation.md (834) ← canonical なので分割注意:
  → 200 行版を l2_foundation/foundation.md に置く (overview)
  → 詳細は l2_foundation/foundation-architecture.md / foundation-schema.md / etc. に逃がす
  → main の頭に link (agent が必要時 follow)
```

`foundation.md` の **path 自体は変えない** (canonical)、内容は overview に絞り、詳細は同 dir 内の partner file に逃がす。

## 7. D1 痛み 8 件 への対応 (l0-l3 維持版)

| 痛み                | 解決                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| 1 命名 3 種並走     | l0-l3 prefix のみ snake (固定)、内部 file は kebab 統一                                 |
| 2 階層乖離          | Tri-SSD contract に厳格に従う = canonical 維持。逸脱 sub-dir は plugin 範囲外として整理 |
| 3 archive 暗黙      | `_archive/` (Tri-SSD canonical) を archive 先と明文化                                   |
| 4 同トピック散在    | distribution / lessons / dispatch を 1 path に統合                                      |
| 5 200+ 行 doc       | 分割 or trim、canonical (vision/foundation) は overview に絞り link                     |
| 6 古い rN 残置      | release-readiness/ → l3_phases/_archive/release-readiness/                              |
| 7 重複 doc          | distribution-readiness vs distribution/microsoft-store 等を統合                         |
| 8 PNG/JSX docs 直下 | l0_ideas/mockups/ に集約                                                                |

## 8. D4' へ持ち込む

- 全 active doc の新 path mapping (l0/l1/l2/l3 維持版)
- 削除リスト (重複 / snapshot / outdated)
- 200 行 split 対象 + 分割粒度
- l3_phases/archive → l3_phases/_archive rename
- broken link gate を最終 commit で集約
- CLAUDE.md / lessons.md / scripts / yml の link 一括 patch

D3' 完了。Step 4 で D4' を再設計する。
