# D3': Tri-SSD plugin contract — 触ってはいけない構造

**Status**: 2026-05-06、tri-ssd plugin v3.6.0 を読み込んだ実調査
**Source**: `~/.claude/plugins/cache/tri-ssd-marketplace/tri-ssd/3.6.0/`

> 注: 「tri-sdd」は user の口頭呼称、実際の plugin 名は **Tri-SSD (Tri-Layer Slice Spec Driven)**、コマンドは `/init-tri-ssd` `/gen-l1..l3` `/gen-code` `/archive-l3` `/split-l3` `/merge-l3` の 8 種。

---

## 1. plugin の動作モデル

Tri-SSD は **Claude Code から呼ばれる仕様駆動開発フレームワーク**。l0-l3 の 4 階層 doc を順に生成し、最終的に `/gen-code` で実装する:

```
L0 (任意 idea) → L1 vision.md → L2 foundation.md → L3 PH-xxxx.md → /gen-code → 実装
```

各コマンドは `Glob` で **特定 path の存在 / 不在** を判定して動作するため、**path / file 名は contract**。

## 2. 絶対に壊してはいけない path / file (contract)

### 必須 dir (4 つ、`/init-tri-ssd` が作る)

| path                    | 役割                        | 命名規則   |
| ----------------------- | --------------------------- | ---------- |
| `docs/l0_ideas/`        | アイディア・ラフメモ (任意) | dir 名固定 |
| `docs/l1_requirements/` | 要件                        | dir 名固定 |
| `docs/l2_foundation/`   | システム構成                | dir 名固定 |
| `docs/l3_phases/`       | フェーズ                    | dir 名固定 |

### 必須 file (canonical path)

| file                               | 役割                              | 命名規則                                                 |
| ---------------------------------- | --------------------------------- | -------------------------------------------------------- |
| `docs/l1_requirements/vision.md`   | L1 要件本体                       | **path 固定**、`/gen-l2` `/gen-l3` `/gen-code` が読む    |
| `docs/l2_foundation/foundation.md` | L2 システム構成本体               | **path 固定**、`/gen-l3` `/gen-code` が読む              |
| `docs/l3_phases/PH-NNNN_*.md`      | L3 フェーズ (連番、kebab-case 名) | `/gen-l3` `/gen-code` `/archive-l3` が glob              |
| `docs/l3_phases/_archive/`         | 完了 phase の archive 先          | **`_archive/` (underscore prefix)**、`archive/` ではない |

### Glob pattern (plugin が使う実行時 path)

| Glob                           | 用途                                            |
| ------------------------------ | ----------------------------------------------- |
| `docs/l3_phases/PH-*.md`       | 初回判定 (`/gen-l3` の Phase 0000 自動生成判定) |
| `docs/l3_phases/**/PH-*$1*/`   | split form 検索 (`/merge-l3`)                   |
| `docs/l3_phases/**/PH-*$1*.md` | inline form 検索 (`/split-l3`)                  |
| `docs/l3_phases/**/*.md`       | gen-code の L3 検索                             |
| `docs/**/*.md`                 | ID 採番時 (REQ / PH / F 既存 ID 検索)           |

`_archive/` 配下は active 検索から **明示的に除外** される。

### ID 形式

```
PREFIX-NNNN  (4 桁ゼロ埋め)
- REQ-0001 .. REQ-NNNN  (L1 内 inline)
- PH-0000               (準備フェーズ予約)
- PH-0001 .. PH-NNNN    (機能フェーズ)
- F-0001 .. F-NNNN      (機能 ID、L3 内)
```

## 3. plugin が **要求しない** こと (柔軟領域)

- **frontmatter**: 使わない (`status: done` 等の YAML は plugin に無関係、user 慣行のみ)
- **L0 配下の file 名 / 構造**: 自由 (memo 置き場、命名強制なし)
- **`docs/` 直下の `*.md`**: lessons.md / SUPPORT.md / dispatch-*.md は plugin 範囲外
- **`docs/l1_requirements/*.md`**: vision.md 以外の追加 file は plugin が読まない
- **`docs/l2_foundation/*.md`**: foundation.md 以外の追加 file は plugin が読まない
- **その他 sub-dir**: `l1_requirements/distribution/` や `l2_architecture/` 等、plugin 名前空間外の dir は **存在しても問題なし**、plugin が読まないだけ

## 4. tri-ssd の "ファイル 200-400 行推奨、最大 800 行厳守" rule

plugin 自身の `CLAUDE.md` に:

> "ファイルサイズ: **200-400行推奨、最大800行厳守**"
> "段階的開示: 基本機能→詳細機能の順で設計"
> "コンテキスト効率: 大きなファイルを一度に読み込まない / 必要な部分のみを参照 / ドキュメント間の重複を避ける"

これは plugin のコマンド開発ルールだが、tri-ssd 思想として **大きすぎる doc は避ける** 方針。
arcagate の独自制約「200 行以内」 は plugin 推奨と整合的。

## 5. 違反すると壊れること (具体)

| 違反                                                          | 壊れる操作                                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `vision.md` を改名 / 移動                                     | `/gen-l2` が L1 を見つけられず `/gen-l3` `/gen-code` も連鎖 fail                   |
| `foundation.md` を改名 / 移動                                 | `/gen-l3` が L2 を見つけられず `/gen-code` も連鎖 fail                             |
| `l3_phases/` 直下を空にして PH-* を別 dir に移動              | `/gen-l3` が初回判定で再度 PH-0000 を作ろうとする (数重複)                         |
| `archive/` を `_archive/` に rename しない                    | `/archive-l3` の glob が拾えない、active と archive の区別崩壊                     |
| `PH-NNNN_*.md` 命名規則を破る (例: `PH-NNN.md` 3 桁)          | `/gen-l3` `/archive-l3` の glob match 失敗                                         |
| ID を 4 桁ゼロ埋めしない (`REQ-1` 等)                         | ID 採番ロジックが整合しない、新規 ID が衝突する                                    |
| frontmatter で `status: done` をつけて archive 移動扱いにする | plugin は frontmatter を読まないので **archive 判定無効**、active 扱いのままになる |

## 6. 「触ってはいけない」 list (Arcagate に対して)

### 絶対 NG (D3' / D5' で **守る**)

1. `docs/l0_ideas/` dir 名 (l0 prefix 固定)
2. `docs/l1_requirements/` dir 名 (l1 prefix 固定)
3. `docs/l1_requirements/vision.md` ← **canonical L1**、移動 / 改名禁止
4. `docs/l2_foundation/` dir 名 (l2 prefix 固定)
5. `docs/l2_foundation/foundation.md` ← **canonical L2**、移動 / 改名禁止
6. `docs/l3_phases/` dir 名 (l3 prefix 固定)
7. `docs/l3_phases/_archive/` (underscore prefix、archive 移動先)
8. `docs/l3_phases/PH-NNNN_*.md` 命名規則
9. ID 形式 `REQ-NNNN` / `PH-NNNN` / `F-NNNN` (4 桁ゼロ埋め連番)

### OK (D3' で整理可)

1. `docs/l1_requirements/distribution/` 等の sub-dir は plugin が読まないので **配置自由**
2. `docs/l2_architecture/` (l2 prefix だが foundation.md と独立、plugin が読まないので削除/再構成可能)
3. `docs/l0_ideas/` 配下の file 構造 (中身は free-form memo)
4. top-level `docs/*.md` (lessons / SUPPORT / dispatch / widget-add-checklist 等)
5. frontmatter は plugin が無視するので追加しても削除しても plugin に影響なし
6. archive 用 path 命名 (l3_phases 以外の archive は `_archive/` 必須でない、user 自由)

## 7. 前回 D5 で **壊した** もの (反省)

| D5 で壊した                                                              | 復活必須                                 |
| ------------------------------------------------------------------------ | ---------------------------------------- |
| `docs/l0_ideas/` 削除 → vision/ へ移動                                   | ✅ 復活 (path 自体を維持)                |
| `docs/l1_requirements/` 削除 → 散在                                      | ✅ 復活                                  |
| `docs/l1_requirements/vision.md` → vision/product.md に rename           | ✅ vision.md に戻す                      |
| `docs/l2_foundation/` 削除 → foundation.md を archive へ                 | ✅ 復活 (foundation.md 残す)             |
| `docs/l3_phases/` 削除 → plans/archive/legacy-phases/ に統合             | ✅ 復活 (l3_phases/_archive/ 構造に戻す) |
| `docs/l3_phases/archive/` → `docs/plans/archive/legacy-phases/` 命名変更 | ✅ `_archive/` underscore prefix に戻す  |

→ **Step 2 で D5 全 commit を `git reset --hard 84ae48a` で revert** して、上記を復元する。

## 8. D3' で許容される変更 (l0-l3 を維持しつつできる整理)

D1 痛み 1-8 のうち、l0-l3 contract を破壊しないで解決できる範囲:

| 痛み                          | 解決可能? | 解決手段                                                                                                                                |
| ----------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 痛み 1 (命名 3 種並走)        | ✅        | l0-l3 prefix は維持、内部 file 名は kebab 化                                                                                            |
| 痛み 2 (l0-l3 階層乖離)       | △         | **plugin が要求する canonical** に戻す = vision.md / foundation.md / PH-*.md を厳守。意図と実態の乖離は本来この contract を守れば消える |
| 痛み 3 (archive 暗黙)         | ✅        | `_archive/` の運用を明文化                                                                                                              |
| 痛み 4 (同トピック散在)       | ✅        | l1_requirements/distribution/ 等の sub-dir 整理は plugin 範囲外なので自由                                                               |
| 痛み 5 (200+ 行 doc)          | ✅        | 巨大 doc を分割 (vision.md / foundation.md は plugin contract 上の canonical なので分割注意、頭に index 残して詳細 sub-dir に逃がす)    |
| 痛み 6 (古い rN 残置)         | ✅        | release-readiness 等の rN は plugin 名前空間外、自由整理                                                                                |
| 痛み 7 (重複 doc)             | ✅        | distribution-readiness と library-overhaul/known-issues 等の重複統合は plugin 影響なし                                                  |
| 痛み 8 (PNG/JSX が docs 直下) | ✅        | `docs/l0_ideas/*.png` は plugin 範囲外なので mockups/ 等への移動可能                                                                    |

## 9. 次の Step

- **Step 2**: `git reset --hard 84ae48a && git push --force origin chore/docs-reorg` で D5 完全 revert
- **Step 3**: D3 (`d3-arcagate-doc-system.md`) を本契約に沿って書き直し
- **Step 4**: D4 (mapping / execution) を再設計
- **Step 5**: D5' 実行 → push 前に user 確認

本書は **完了**。Step 2 へ移る。
