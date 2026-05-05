# D4: 削除対象 doc 一覧 + 理由

**Status**: 2026-05-06 D3 削除運用方針に基づく
**前提**: user 指示「**古い内容は全部消して OK (git に残るから)**」

→ 移動 / 統合 / 分割は [d4-mapping.md](./d4-mapping.md)、実行順序は [d4-execution.md](./d4-execution.md) 参照。

## 削除判定の 4 基準

D3 §10 より:

1. **完全に superseded** — 後続 doc に内容が吸収済
2. **重複** — 別 path に同じ内容
3. **snapshot / 一時** — 時点 dump、live 価値なし
4. **巨大かつ live update なし** — 200+ 行で更新止まってる reference 価値低 doc

「reference 価値あり」 = archive 行き、それ以外 = 削除 (git 履歴で代替)。

## 削除対象 (~15 件)

### 1. 完全に superseded (3 件)

| path                                                         | 理由                                                              | 代替                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `docs/archive/arcagate-engineering-principles-historical.md` | live `vision/engineering-principles.md` で十分、historical は重複 | git history `git log -- docs/l0_ideas/arcagate-engineering-principles.md` |
| `docs/archive/dispatch-operation-historical.md`              | live `guide/dispatch-rules.md` 移行で historical 不要             | git history                                                               |
| `docs/archive/lessons-historical.md`                         | live `lessons.md` で十分                                          | git history                                                               |

`docs/archive/` 直下は **全削除** (`docs/plans/archive/` に統合不要、historical = git で十分)。

### 2. 重複 (2 件)

| path                                                             | 理由                                                                      | 代替                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| `docs/distribution-readiness.md` (126 行)                        | `docs/l1_requirements/distribution/microsoft-store.md` (R10-Y) と内容重複 | guide/microsoft-store.md |
| `docs/l1_requirements/library-overhaul/known-issues.md` (158 行) | `lessons.md` と重複領域、live 必要なら lessons へ取り込み                 | lessons.md               |

### 3. snapshot / 一時 (5 件)

| path                                                  | 理由                                                       | 代替                 |
| ----------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| `docs/dispatch-log.md` (3628 行)                      | live activity log、巨大、agent context 圧迫、PR 履歴で十分 | git log              |
| `docs/dispatch-queue.md` (45 行)                      | 操作中 queue は実装 (TodoWrite / GitHub Issues) で表現済   | TodoWrite tool       |
| `docs/l2_architecture/codex-review-2026-04-25.md`     | review snapshot、内容は merged                             | git log + lessons.md |
| `docs/l2_architecture/cleanup-candidates.md` (28 行)  | 28 行 snapshot、plans/active で持つべき                    | (削除のみ)           |
| `docs/l2_architecture/polish-era-progress.md` (58 行) | R10 完了後 stale                                           | git log              |

### 4. 巨大 / live update なし (3 件)

| path                                                                   | 理由                                            | 代替                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------- |
| `docs/l2_architecture/refactoring-opportunities.md` (215 行)           | live spec 化せず、phase 着手時に再生成          | phase plan 時に再評価                   |
| `docs/l2_architecture/use-case-friction.md` (237 行)                   | v2 (500 行) で superseded                       | use-case-friction-v2.md (archive)       |
| `docs/l1_requirements/release-readiness/auto-checks/README.md` (58 行) | 内容は CI yml と重複、scripts/ 直接読めば足りる | `.github/workflows/ci.yml` / `scripts/` |

### 5. ux-research codex review batch (4 件)

| path                                                         | 理由                         |
| ------------------------------------------------------------ | ---------------------------- |
| `docs/l1_requirements/ux-research/codex-review-batch-92.md`  | batch ごとの review snapshot |
| `docs/l1_requirements/ux-research/codex-review-batch-95.md`  | 同上                         |
| `docs/l1_requirements/ux-research/codex-review-batch-101.md` | 同上                         |
| `docs/l1_requirements/ux-research/codex-review-batch-106.md` | 同上                         |

代替: `docs/plans/archive/ux-research/codex-review.md` (concat 版) を archive に残す。batch 個別 doc は git log で代替。

### 6. .gitkeep (3 件)

| path                            | 理由                     |
| ------------------------------- | ------------------------ |
| `docs/l0_ideas/.gitkeep`        | dir 移動で空になる、不要 |
| `docs/l1_requirements/.gitkeep` | 同上                     |
| `docs/l3_phases/.gitkeep`       | 同上                     |
| `docs/l2_foundation/.gitkeep`   | 同上                     |

## 削除しないもの (reference 価値あり、archive 行き)

- `audit-final-rN.md` 全件 (R6-R10): release readiness audit 履歴は **意思決定の経緯**、archive 価値あり
- `phase-l1/l2/l3-plan.md`: library-overhaul の phase plan は完了 retrospective として archive 価値
- `workspace-canvas-rewrite/phase1-*` 全件: 大規模 rewrite の investigation/plan、archive 価値
- `l2_architecture/folder-map.md` / `frontend-backend-split.md`: spec 化候補
- `l2_architecture/performance-baseline.md` (369 行): baseline snapshot、archive 価値 (時系列比較用)
- `l3_phases/archive/` 全 503 件: 既に archive、`plans/archive/legacy-phases/` へ統合 path で grep 互換

## 確認 script (D5 実行前)

削除前に各削除候補が **実際に他 doc から参照されてないか** grep:

```bash
for f in $(cat d4-delete-list.txt); do
  refs=$(grep -rEn "$(basename "$f" .md)" docs/ --include='*.md' | grep -v "^$f:" | wc -l)
  echo "$f: $refs cross-ref"
done
```

cross-ref > 0 の path は D5 で個別判断 (削除 OK or archive 行き)。

## サマリ

| 区分                    | 件数   |
| ----------------------- | ------ |
| 完全 superseded         | 3      |
| 重複                    | 2      |
| snapshot / 一時         | 5      |
| 巨大 / live update なし | 3      |
| codex review batch      | 4      |
| .gitkeep                | 4      |
| **削除合計**            | **21** |

reference 価値あり (archive) との比率は archive ~70 : delete ~21 ≈ 3.3:1。

## 退行検出

削除後 grep:

```bash
# 削除した doc 名がリポ全体から参照されてないこと
for name in dispatch-log distribution-readiness known-issues codex-review-batch refactoring-opportunities use-case-friction polish-era cleanup-candidates auto-checks; do
  hits=$(grep -rE "$name" --include='*.md' --include='*.svelte' --include='*.ts' --include='*.rs' . | grep -v 'docs/plans/archive' | wc -l)
  if [ "$hits" -gt 0 ]; then
    echo "WARN: $name still referenced ($hits hits)"
  fi
done
```

CLAUDE.md / lessons.md / 残 active doc から削除済 path への broken link が無いことを確認。
