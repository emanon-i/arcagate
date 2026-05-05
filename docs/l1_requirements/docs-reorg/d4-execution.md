# D4': 実行手順 (Tri-SSD contract 準拠版)

**Status**: 2026-05-06 D3' + d4-mapping' + d4-deletes' に基づく
**前提**: l0-l3 を **絶対に維持**、`docs/l3_phases/_archive/` を Tri-SSD archive 先と確定。1 PR + 12-15 commit で完遂、最終 commit に broken link gate 集約、push 前に **必ず user 確認**。

→ mapping は [d4-mapping.md](./d4-mapping.md)、削除は [d4-deletes.md](./d4-deletes.md) 参照。

## branch 戦略

`chore/docs-reorg` branch を継続使用 (D3'/D4' 設計修正 commit を積む)、D5' commit を 12-15 個追加。**push は最終 commit + user 確認後のみ**。

## commit 単位 (順序重要、最終 commit に broken-link gate)

```
1. (既に commit 済) D3' contract 記録 (dbf568c)
2. (既に commit 済) D3'/D4' 再設計 doc 修正 (本 commit)
3. l3_phases/archive → _archive rename (Tri-SSD canonical 復元)
4. l0_ideas/ kebab 化 + mockups/ sub-dir 作成
5. l1_requirements/ 直下 kebab 化 (vision.md は触らない、ux_design_vision → l0、ux_standards / design_system rename)
6. l1_requirements/distribution/ 統合 (top-level SUPPORT/dispatch/distribution-rollback を distribution/ へ)
7. l1_requirements/release-criteria 統合 (criteria 4 件 → l1 直下)
8. l1_requirements/library-overhaul → l3_phases/_archive/library-overhaul/ 移動
9. l1_requirements/release-readiness → l3_phases/_archive/release-readiness/ 移動 + user-action-needed のみ distribution/ へ
10. l1_requirements/workspace-canvas-rewrite → l3_phases/_archive/workspace-canvas-rewrite/
11. l1_requirements/ux-research → l3_phases/_archive/ux-research/ (codex-review-batch-* は削除)
12. l2_architecture/ snapshot 系を _archive/ へ + live は維持
13. l2_foundation/foundation.md 200 行 split (canonical path 維持、内容を overview + partner files に分離)
14. 200 行 split: ux-standards / desktop-ui-rules / concept / design-system / industrial-yellow / ux-design
15. delete 21 件 + l1_requirements/design/ dir 解消 + l0_ideas/.gitkeep / 等
16. llms.txt / README.md / l3_phases/README.md 新規作成
17. CLAUDE.md / lessons.md / scripts / yml 内 link 一括 patch (新 path に書換)
18. broken link gate (退行検出 script 実行 + 0 件確認)、user 確認待ち
```

15+ commit。各 commit は **論理的に独立**、broken link は最終 commit 17 直前まで許容、commit 18 で gate。

## 各 commit の重要 detail

### Commit 3: `_archive/` rename

```bash
git mv docs/l3_phases/archive docs/l3_phases/_archive
```

これだけで Tri-SSD canonical 違反を解消。中身 503 件は path 変更されるが file 名は保持、grep 互換 OK。

### Commit 13: foundation.md 分割 (canonical 維持)

`docs/l2_foundation/foundation.md` (834) は canonical path 固定。**path を変えずに分割**:

```
docs/l2_foundation/
├── foundation.md                  ← 200 行版 (overview + partner link)
├── foundation-stack.md            ← §1 技術スタック詳細
├── foundation-architecture.md     ← §2 アーキテクチャ詳細
├── foundation-non-functional.md   ← §3 非機能要求
├── foundation-schema.md           ← §4 SQLite スキーマ
├── foundation-cicd.md             ← §5 CI/CD
└── foundation-glossary.md         ← §6 用語集
```

`foundation.md` 自身は overview + 各 partner への link 集に絞る。`/gen-l3` `/gen-code` は `foundation.md` を読むだけだが、Read で agent が overview から partner を follow する余地を作る。

**重要**: tri-ssd plugin は `foundation.md` の中身を解析しない (read するだけ)。だから overview だけでも plugin 動作は壊れない。

### Commit 14: 200 行 split

| file                                 | 旧行数 | 新分割                          |
| ------------------------------------ | ------ | ------------------------------- |
| `ux-standards.md`                    | 879    | main + part-2..6 各 ≤200        |
| `desktop-ui-rules.md`                | 537    | main + part-2..4                |
| `concept.md` (l0)                    | 314    | main + concept-extras           |
| `design-system.md` (l1)              | 283    | main + design-system-extras     |
| `industrial-yellow.md` (l1)          | 229    | main + industrial-yellow-extras |
| `ux-design.md` (l0)                  | 242    | main + ux-design-extras         |
| `pubkey-procedure.md` (distribution) | 207    | trim 7 行                       |

### Commit 17: link 一括 patch 対象

```
CLAUDE.md          ← 新 path table
docs/lessons.md    ← lessons-historical / dispatch-operation / library-overhaul/known-issues 等の link
docs/l0_ideas/*.md ← cross-link (concept ↔ visual-language 等)
docs/l1_requirements/*.md ← 内部 cross-link
.github/workflows/e2e-nightly.yml  ← measurement json path
.github/workflows/release.yml      ← cosign-verification.md / SUPPORT.md
~/.claude/projects/.../memory/MEMORY.md          ← user memory 内 doc link
~/.claude/projects/.../memory/design_guidelines_index.md  ← 同上
```

### Commit 18: broken link gate (push 前必須)

```bash
# 1. Tri-SSD canonical 存在確認
for p in docs/l0_ideas docs/l1_requirements/vision.md docs/l2_foundation/foundation.md docs/l3_phases docs/l3_phases/_archive; do
  test -e "$p" || { echo "FATAL: missing $p"; exit 1; }
done

# 2. broken link 検出
broken=0
for f in $(find docs CLAUDE.md README.md -name '*.md' -not -path 'docs/l3_phases/_archive/*' 2>/dev/null); do
  refs=$(grep -oE '\(\.\./[^)]+\.md\)|\(\./[^)]+\.md\)|`docs/[^ \`)]+\.md`|\]\(docs/[^)]+\.md\)' "$f" 2>/dev/null | sed 's/[()`\]]//g')
  for ref in $refs; do
    case "$ref" in
      docs/*) target="$ref" ;;
      ../*) target=$(realpath -m --relative-to=. "$(dirname "$f")/$ref" 2>/dev/null) ;;
      ./*) target="$(dirname "$f")/${ref#./}" ;;
    esac
    if [ ! -e "$target" ]; then
      echo "BROKEN: $f -> $ref"
      broken=$((broken+1))
    fi
  done
done
[ "$broken" -eq 0 ] || { echo "FATAL: $broken broken links"; exit 1; }

echo "✓ All checks pass"
```

すべて 0 hits + Tri-SSD canonical 存在確認 OK で commit 18 確定 → **user 確認待ち** → 受領後 push。

## 真ブロッカー候補 (Step 5 で発見次第 user 確認)

D3' で前回からの判断を見直し、以下は agent 独断で判断:

1. **foundation.md 分割の中身**: §1 技術スタックは l0_ideas に既出 (engineering-principles.md / concept.md と重複)、partner file `foundation-stack.md` を作るか overview に含めるか → **overview に短く要点記載、詳細は engineering-principles.md / concept.md へ link** (重複排除)
2. **ADR retro 化**: 前回 D5 で 0001-0005 を作ったが、Tri-SSD plugin は ADR を読まない (`/gen-l3` は L2 を読むだけ) → **ADR 廃止、内容は engineering-principles.md / foundation.md / lessons.md に統合**
3. **use-case-friction-v2 (500)**: live 価値疑問 → archive (`l2_architecture/_archive/`)、削除はしない (user 判断 "迷うなら残す")

これらは D5' 進行時に止まらず agent 判断で進める。

## 報告タイミング

- D4' 完成 (本 commit): 即 user 報告
- D5' 進行中: progress milestone なし
- D5' commit 18 broken link gate pass: **必ず user 確認**してから push

## 期待効果 (l0-l3 維持版)

| 指標                               | before (D1)                  | after (D5')                    | 改善     |
| ---------------------------------- | ---------------------------- | ------------------------------ | -------- |
| Tri-SSD canonical 違反             | 1 (`archive/` underscore 欠) | 0                              | ✅       |
| top-level docs 直下 misc files     | 9                            | 2 (lessons.md + README.md)     | -78%     |
| 命名規則 3 種並走                  | あり                         | kebab 統一 (l0-l3 prefix 除く) | 統一     |
| 200 行超え active                  | 8                            | 0                              | -100%    |
| 同トピック散在 (例: pubkey 3 path) | あり                         | 1 path (distribution/)         | 解消     |
| broken link risk                   | 高                           | 0 (commit 18 で gate)          | 解消     |
| dispatch-log 3628 行               | 存在                         | 削除 (git log で代替)          | -3628 行 |
| `_archive/` Tri-SSD 整合           | 違反                         | 整合                           | ✅       |

D4' 完了。Step 5 で D5' 実行 (push 前 user 確認必須)。
