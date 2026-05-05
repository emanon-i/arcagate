# D1: docs/ 現状調査

**Status**: 2026-05-06、docs reorg phase 1 (現状調査、実装入らず)
**Method**: `find` / `wc -l` / `git log` / grep cross-link 集計

## 1-1. 全 doc inventory

### Active doc 件数

| 領域                                                   | 件数            | 備考                                                         |
| ------------------------------------------------------ | --------------- | ------------------------------------------------------------ |
| `docs/` (top-level)                                    | 9               | dispatch / SUPPORT / lessons / etc.                          |
| `docs/l0_ideas/`                                       | 4 md + 4 binary | concept / mock                                               |
| `docs/l1_requirements/` 直下                           | 6               | vision / use-cases / ux_standards / etc.                     |
| `docs/l1_requirements/design/`                         | 1               | industrial-yellow-spec                                       |
| `docs/l1_requirements/distribution/`                   | 2               | pubkey-procedure / cosign-verification (R10-X 後)            |
| `docs/l1_requirements/library-overhaul/`               | 12              | phase1-3 plan + investigation                                |
| `docs/l1_requirements/release-readiness/`              | 16              | criteria / audit-final-r4..r10 / measurements                |
| `docs/l1_requirements/release-readiness/auto-checks/`  | 1               | README                                                       |
| `docs/l1_requirements/release-readiness/measurements/` | 6               | axe / d7-d8 / i18n / coverage                                |
| `docs/l1_requirements/ux-research/`                    | 8               | cedec / claude-skills / codex-review × N                     |
| `docs/l1_requirements/workspace-canvas-rewrite/`       | 14              | phase1-investigation-1..6 + phase1-plan-1..4                 |
| `docs/l2_architecture/`                                | 15              | bundle / complexity / folder-map / use-case-friction (v1+v2) |
| `docs/l2_foundation/`                                  | 1               | foundation.md (834 行、巨大)                                 |
| `docs/l3_phases/_template/`                            | 1               | use-case-audit template                                      |
| **active 合計**                                        | **~94 md**      | (binary + .gitkeep 除く)                                     |

### Archive 件数

| 領域                      | 件数                               |
| ------------------------- | ---------------------------------- |
| `docs/archive/`           | 3                                  |
| `docs/l3_phases/archive/` | 489 (直下) + 14 (sub-dir 内) = 503 |
| **archive 合計**          | **506**                            |

active : archive = **94 : 506** (≈ 1:5.4)。配布 era まで来た arcagate は archive が大半を占める。

### 行数分布 (active のみ)

| 範囲       | 件数 | 例                                                                                                                                                                                 |
| ---------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0-50 行    | 11   | codex-review-batch-* / d7-d8-perf / etc.                                                                                                                                           |
| 50-150 行  | 47   | audit-final-r6 / criteria-* / pubkey-procedure / etc.                                                                                                                              |
| 150-300 行 | 24   | vision / ux_design_vision / lessons / etc.                                                                                                                                         |
| 300-500 行 | 5    | desktop_ui_ux_agent_rules / arcagate-concept / etc.                                                                                                                                |
| 500+ 行    | 7    | use-case-friction-v2 (500) / dispatch-log (3628) / ux_standards (879) / foundation (834) / arcagate_mockup_board.jsx (932) / mock PNGs (700-953) / desktop_ui_ux_agent_rules (537) |

**200 行制約に違反 ≥ 300 行**: 12 件 (active md + binary 含む)。**user 指示の 200 行制約は守られていない領域がある**。

### 命名規則の混在

```
desktop_ui_ux_agent_rules.md          ← snake_case
dispatch-operation.md                 ← kebab-case (top-level)
arcagate-engineering-principles.md    ← kebab-case (l0)
ux_standards.md                       ← snake_case (l1 直下)
ux-research/                          ← kebab-case (subdir)
design_system_architecture.md         ← snake_case (l1 直下)
PH-20260226-003_power-user-expansion  ← `PH-YYYYMMDD-NNN_name` (l3_phases 独自)
phase1-investigation-1-codemap.md     ← `phase1-X-N-name` (workspace-canvas-rewrite 独自)
audit-final-r10.md                    ← `audit-final-rN` (release-readiness 独自)
codex-review-batch-101.md             ← `codex-review-batch-N` (ux-research 独自)
```

3 種以上の命名規則が並走、領域ごとに ad hoc。

## 1-2. 階層構造

### l0/l1/l2/l3 の意図と実態

| 階層                | 意図 (元設計)      | 実態                                                                                                          |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **l0_ideas**        | コンセプト・mockup | 4 md + 4 binary、活きてる (concept / engineering-principles 参照頻度高)                                       |
| **l1_requirements** | 機能要件 / 仕様    | 6 sub-dir + 直下 6 md、混雑、釈然としない sub-dir 命名 (release-readiness vs library-overhaul vs ux-research) |
| **l2_architecture** | アーキテクチャ     | 15 md、metrics / refactoring opportunities / use-case-friction が混在、何が live で何が snapshot か不明       |
| **l2_foundation**   | 基盤               | 1 file (foundation.md 834 行)、l2_architecture との境界不明                                                   |
| **l3_phases**       | 実装フェーズ       | active 0、archive 489 (1 sub-dir 内に 13)、ナンバリング規則複数並走 (PH-NNN / PH-YYYYMMDD-NNN / PH-issue-NNN) |

### 同トピック散在

- 「i18n」: `release-readiness/measurements/i18n-baseline.md` + `release-readiness/audit-quality.md` + `audit-final-rN.md` 各々で言及、source of truth 不明
- 「pubkey」: `distribution/pubkey-procedure.md` + `release-readiness/user-action-needed.md` (cross-link で繋がるが) + `audit-final-rN.md` 各々で重複言及
- 「distribution」: `docs/distribution-readiness.md` + `docs/distribution-rollback-sop.md` + `l1_requirements/distribution/` の 3 か所
- 「lessons」: `docs/lessons.md` (live) + `docs/archive/lessons-historical.md` (圧縮済 history)
- 「dispatch」: `docs/dispatch-operation.md` (rules) + `docs/dispatch-log.md` (3628 行 history) + `docs/dispatch-queue.md` (45 行)、log と queue の責務が曖昧

### archive 運用

- `docs/archive/` (3 件): `lessons-historical` / `dispatch-operation-historical` / `arcagate-engineering-principles-historical` (= live doc を圧縮した時の旧版 dump)
- `docs/l3_phases/archive/` (489 件): status: done の plan を全部投げ込み、ナンバリング規則 3 種並走、新規 PR で参照されることはほぼ無い
- archive 行きの基準は **暗黙的** (status: done であれば移動)、明文化されたルールなし

## 1-3. 連動関係

### CLAUDE.md からの link (active)

CLAUDE.md `## いつ何を読むか` table に列挙:

```
バッチ着手 / 進行ルール       → docs/dispatch-operation.md
設計判断 / FE-BE 分担        → docs/l0_ideas/arcagate-engineering-principles.md
UI / 視覚                  → docs/l1_requirements/ux_standards.md / desktop_ui_ux_agent_rules.md
テーマ / トークン            → docs/l1_requirements/design_system_architecture.md
製品方針 / マイルストーン      → docs/l1_requirements/vision.md
過去の失敗                  → docs/lessons.md
ガイドライン doc 全体地図     → memory/design_guidelines_index.md
古い retrospective          → docs/l3_phases/archive/、docs/archive/
```

8 個の active doc に link、archive は方向のみ示す。

### 内部 cross-link

- 466 個の `docs/...` 形式参照 across 171 file
- 古い参照例: `R5 で実装検討` (R5 は当該機能 R4 で完了済)、`L4 多言語化フェーズ` (まだ着手前で正)
- **stale**: `audit-final-rN` 系が古い rN を相互参照、リポ自体は最新の rN+1 まで進んでる場合あり

### 重複 / 矛盾

- `docs/distribution-readiness.md` と `docs/l1_requirements/distribution/*.md` で内容重複の懸念
- `release-readiness/audit-final-rN.md` (R4-R10) で audit 数値推移が累積、最新の rN が source of truth だが旧 rN-1 も残置
- `docs/l2_architecture/use-case-friction.md` と `use-case-friction-v2.md` が並存、v1 をなぜ残してるか不明

## 1-4. 運用実態

### 過去 30+ PR で更新された doc 領域

git log --since 2026-03-01 -- docs/ のサンプル (上位 20 commit):

- `release-readiness/audit-final-r*` 系: 9 PR (R4 / R5 / R6 / R7 / R8 / R9 / R10 + criteria 系)
- `distribution/`: 3 PR (pubkey / cosign / MS Store、すべて R10)
- `library-overhaul/`: 2 PR (Phase L3 plan / decisions)
- `workspace-canvas-rewrite/`: 4 PR (phase1 investigation + plan)
- top-level (`lessons.md` / `dispatch-*`): 5+ PR (頻繁に更新)
- `l2_architecture/`: 2 PR (codex-review / performance-baseline)

short-life (audit / plan / investigation): **更新頻度高、cycle ごとに rN+1 が積もる**
long-life (vision / ux_standards / lessons): **更新頻度低、参照頻度高**

比率は感覚的に short:long = 7:3 で short-life が多い。

### archive 移動運用

- `docs/l3_phases/` 直下 = active 0、template 1 のみ
- 過去 14 sub-dir (PH-20260226-003_power-user-expansion 等) のうち、最古は 2026-02 〜 直近は 2026-04
- **archive 行きの operation がほぼ自動化されてない** (PR 提出者が手動で `mv` するだけ)、結果として「移すべきだったが残ってる」doc が l1_requirements/release-readiness/ に多数 (audit-final-r4〜r9 は R10 で superseded されてるが残置)

## 1-5. 既知の痛み (実例)

1. **「探したけど見つからない」**: 「frecency」 の議論を探すと `library-overhaul/decisions.md` / `release-readiness/audit-final-r9.md` / `lessons.md` に分散、source of truth 不明
2. **「どこに書くか迷う」**: 直近の R10-Y MS Store 配置作業を書く時、`docs/distribution-readiness.md` (top-level) と `docs/l1_requirements/distribution/` (sub) のどちらが正か直感で決まらず、後者を選択 (ad hoc)
3. **「重複してる」**: `distribution-readiness.md` (126 行) と `l1_requirements/distribution/microsoft-store.md` (177 行) で同じ content (Tauri MSIX 不可 / Store 提出 path) を別々に書いてる
4. **「200 行制約に引っかかって分割が雑」**: `workspace-canvas-rewrite/` で `phase1-investigation-1〜6.md` + `phase1-plan-1〜4.md` に細切れ分割、1 投稿で読みづらい (cross-link 多発)
5. **古い doc が残置**: `audit-final.md` (R4 + R5 直後の判定、R6 以降 superseded) が live dir に残存
6. **奇形ファイル**: `arcagate_mockup_board.jsx` (l0_ideas/、932 行 React JSX) や mock PNG (700-953 行) が `wc -l` で巨大 doc に化ける、mdに統一されてない
7. **dispatch-log.md** (3628 行): historical activity log、live update も入る、大きすぎて grep / agent context 読み込み非効率

## まとめ (D1 → D2 へ持ち込む課題)

1. **命名規則 3 種以上並走** → 統一
2. **階層 l0/l1/l2/l3 の意図と実態が乖離** → 再設計
3. **archive 運用が暗黙的** → 明文化 + 移動条件 / 削除条件
4. **同トピック散在** → 1 トピック 1 file (例外を明確化)
5. **巨大 doc (300-3628 行)** → 分割 or 削除
6. **古い rN 系が残置** → 最新だけ live、それ以外 archive
7. **重複 doc** → 統合 or 一方削除
8. **奇形 (PNG / JSX が docs/ 直下)** → mdに統一 or assets/ へ分離

D2 では Diátaxis / Divio / ADR / RFC pattern 等の web research を行い、Arcagate の **1 person + agent / 短命:長命 = 7:3 / 200 行制約** に合う方式を D3 で設計する。
