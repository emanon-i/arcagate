# D4': 削除対象 (Tri-SSD contract 準拠版)

**Status**: 2026-05-06 D3' 削除運用方針に基づく
**前提**: l0-l3 contract を破壊しない。`docs/l3_phases/_archive/` を **唯一の archive 先** とする (Tri-SSD canonical)、`docs/l2_architecture/_archive/` は plugin 範囲外の secondary archive。

→ 移動 / 統合は [d4-mapping.md](./d4-mapping.md)、実行は [d4-execution.md](./d4-execution.md) 参照。

## 削除判定の 4 基準 (D3 と同じ)

1. **完全に superseded** — 後続 doc に内容が吸収済
2. **重複** — 別 path に同じ内容
3. **snapshot / 一時** — 時点 dump、live 価値なし
4. **巨大かつ live update なし** — 200+ 行で更新止まってる reference 価値低

「reference 価値あり」 → archive、それ以外 → 削除 (git history で代替)。

## 削除対象 (~16 件)

### 1. 完全に superseded (3 件)

| path                                                         | 理由                                                         | 代替        |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----------- |
| `docs/archive/arcagate-engineering-principles-historical.md` | live `l0_ideas/engineering-principles.md` で十分             | git history |
| `docs/archive/dispatch-operation-historical.md`              | live `l1_requirements/distribution/dispatch-rules.md` で十分 | git history |
| `docs/archive/lessons-historical.md`                         | live `lessons.md` で十分                                     | git history |

→ `docs/archive/` dir 全削除。

### 2. 重複 (2 件)

| path                                                          | 理由                                                                 | 代替                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------- |
| `docs/distribution-readiness.md` (126)                        | `l1_requirements/distribution/microsoft-store.md` (R10-Y) と内容重複 | distribution/microsoft-store.md |
| `docs/l1_requirements/library-overhaul/known-issues.md` (158) | `lessons.md` と重複領域                                              | lessons.md                      |

### 3. snapshot / 一時 (5 件)

| path                                               | 理由                                        | 代替                 |
| -------------------------------------------------- | ------------------------------------------- | -------------------- |
| `docs/dispatch-log.md` (3628)                      | live activity log、巨大、agent context 圧迫 | git log              |
| `docs/dispatch-queue.md` (45)                      | TodoWrite で代替                            | TodoWrite tool       |
| `docs/l2_architecture/codex-review-2026-04-25.md`  | review snapshot                             | git log + lessons.md |
| `docs/l2_architecture/cleanup-candidates.md` (28)  | snapshot、plans/active で持つべき           | (削除)               |
| `docs/l2_architecture/polish-era-progress.md` (58) | R10 完了後 stale                            | git log              |

### 4. 巨大 / live update なし (3 件)

| path                                                                | 理由                                   | 代替                       |
| ------------------------------------------------------------------- | -------------------------------------- | -------------------------- |
| `docs/l2_architecture/refactoring-opportunities.md` (215)           | live spec 化せず、phase 着手時に再生成 | phase plan 時              |
| `docs/l2_architecture/use-case-friction.md` (237)                   | v2 で superseded                       | v2 を archive              |
| `docs/l1_requirements/release-readiness/auto-checks/README.md` (58) | CI yml と重複                          | `.github/workflows/ci.yml` |

### 5. ux-research codex review batch (4 件)

| path                                                         | 理由                         |
| ------------------------------------------------------------ | ---------------------------- |
| `docs/l1_requirements/ux-research/codex-review-batch-92.md`  | batch ごとの review snapshot |
| `docs/l1_requirements/ux-research/codex-review-batch-95.md`  | 同上                         |
| `docs/l1_requirements/ux-research/codex-review-batch-101.md` | 同上                         |
| `docs/l1_requirements/ux-research/codex-review-batch-106.md` | 同上                         |

代替: `codex-review.md` (concat 版) を `l3_phases/_archive/ux-research/` に保管。

### 6. .gitkeep (4 件)

| path                            | 理由                   |
| ------------------------------- | ---------------------- |
| `docs/l0_ideas/.gitkeep`        | dir に file 入って不要 |
| `docs/l1_requirements/.gitkeep` | 同上                   |
| `docs/l2_foundation/.gitkeep`   | 同上                   |
| `docs/l3_phases/.gitkeep`       | 同上                   |

## 削除しないもの (reference 価値あり、archive 行き)

### Tri-SSD canonical archive (`docs/l3_phases/_archive/`) へ

- `audit-final-rN.md` 全件 (R6-R10): release readiness audit 履歴 = **意思決定の経緯**
- library-overhaul の phase plan 11 件 (decisions / design-direction / inventory / phase-l1-3 / 等)
- workspace-canvas-rewrite phase 1 / 1.1 全 14 件
- ux-research の cedec / claude-skills / codex-review (concat) / industry-standards
- release-readiness の measurements 6 件 / criteria 移動済以外 / gap-list / lessons-test-cross-reference

### l2_architecture/_archive/ (plugin 範囲外、secondary archive)

- baseline 系 (bundle / complexity / performance 369 行 / metrics)
- module-graph / component-graph / dependency-quality
- use-case-friction-v2 (500、v1 削除済)

### live で残すもの (l2_architecture 範囲)

- `folder-map.md` (156) - reference 価値あり
- `frontend-backend-split.md` - reference 価値あり

### 既に archive (移動のみ)

- `docs/l3_phases/archive/` 503 件 → `docs/l3_phases/_archive/` (dir rename のみ、内容変更なし)

## 確認 script (D5' 実行前)

各削除候補が実際に他 doc から参照されていないか検証:

```bash
for name in dispatch-log dispatch-queue distribution-readiness known-issues codex-review-batch refactoring-opportunities use-case-friction polish-era cleanup-candidates auto-checks codex-review-2026-04-25; do
  hits=$(grep -rE "$name" --include='*.md' --include='*.svelte' --include='*.ts' --include='*.rs' --include='*.yml' . 2>/dev/null | grep -v '_archive' | grep -v 'docs/l1_requirements/docs-reorg/d' | wc -l)
  if [ "$hits" -gt 0 ]; then
    echo "WARN: $name 削除前に refs 残り ($hits hits)"
  fi
done
```

cross-ref > 0 は削除前に CLAUDE.md / lessons.md 等の link を更新する。

## サマリ

| 区分                              | 件数   |
| --------------------------------- | ------ |
| 完全 superseded (`docs/archive/`) | 3      |
| 重複                              | 2      |
| snapshot / 一時                   | 5      |
| 巨大 / live update なし           | 3      |
| codex review batch                | 4      |
| .gitkeep                          | 4      |
| **削除合計**                      | **21** |

archive ~70 : delete ~21 ≈ 3.3:1。前回 D5 と同じ削除規模、ただし **l0-l3 contract は守る**。

## 退行検出 (commit 14 で実行)

```bash
# Tri-SSD canonical 必須 path 存在確認
for p in docs/l0_ideas docs/l1_requirements/vision.md docs/l2_foundation/foundation.md docs/l3_phases/_archive; do
  if [ ! -e "$p" ]; then
    echo "FATAL: Tri-SSD canonical missing: $p"
  fi
done

# active doc から削除済 path への broken link 検出
# (d4-execution.md の broken-link gate と統合)
```

Tri-SSD canonical が壊れていたら絶対 fail とする。
