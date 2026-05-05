# D4: 実行手順 (D5 で消化する commit 計画)

**Status**: 2026-05-06 D3 設計 + d4-mapping + d4-deletes をまとめた execution plan
**前提**: 1 PR + 12-15 commit で完遂、agent navigation を壊さないよう小刻みに分割

→ mapping は [d4-mapping.md](./d4-mapping.md)、削除は [d4-deletes.md](./d4-deletes.md) 参照。

## branch 戦略: 1 branch / 12-15 commit / 1 PR

理由:

- 複数 PR にすると **中間状態で broken link が main に乗る** (CLAUDE.md 更新と doc 移動の同期が崩れる)
- agent (本セッション含む) が navigation 失敗、後続作業に支障
- atomic な reorg で 1 PR、commit 単位で revert 可能性を確保

branch 名: `docs/reorg-d5-execute`。

## commit 単位 (順序重要)

```
1. mkdir 新階層 + .gitkeep + docs/README.md / llms.txt 雛形 (空ベース)
2. mv vision (l0_ideas/* → vision/、l1_requirements/{vision,use-cases,ux_design_vision}.md → vision/)
3. mv spec (ux_standards / design_system / industrial-yellow / desktop_ui_ux / widget-add-checklist / 旧 l2_architecture/folder-map / frontend-backend-split / 旧 ux-research/industry-standards)
4. spec 統合 (criteria 4 件 → release-criteria.md、要分割なら -part-2.md 等)
5. mv guide (旧 distribution/ 3 件 + 旧 SUPPORT + dispatch-operation + distribution-rollback-sop + user-action-needed)
6. 200 行超え doc を分割 (ux-standards / desktop-ui-rules / pubkey-procedure / industrial-yellow / l2_foundation/foundation 解体)
7. ADR retro 化 (0001-0005 を新規作成、既存 doc から決定理由を抽出)
8. mv archive (library-overhaul / release-readiness / workspace-canvas-rewrite / ux-research / l2_architecture snapshot 系 → plans/archive/)
9. mv legacy phases (l3_phases/archive/* 503 件 → plans/archive/legacy-phases/)
10. delete (dispatch-log / dispatch-queue / distribution-readiness / known-issues / codex-review-batch × 4 / docs/archive/* 3 件 / l2_architecture snapshot 系 / .gitkeep × 4)
11. llms.txt + README.md + plans/README.md + adr/README.md 完成
12. CLAUDE.md update (新 path に link、200 行制約遵守)
13. memory/MEMORY.md update (新 path に link)
14. broken link check + grep 退行検出 (d4-deletes §退行検出 script を実行)
15. (本 reorg-plan も最後に archive 移動: docs/l1_requirements/docs-reorg/ → docs/plans/active/docs-reorg/、PR merge 後 archive 化)
```

## 各 commit の内容 / 制約

### Commit 1: 新階層 mkdir + 雛形

```
docs/
  README.md            ← 「Arcagate docs。詳細は llms.txt」 だけの 5 行
  llms.txt             ← 全 path 一覧、後で§commit 11 で完成
  vision/.gitkeep
  spec/.gitkeep
  guide/.gitkeep
  adr/.gitkeep
  plans/active/.gitkeep
  plans/archive/.gitkeep
```

### Commit 2-9: mv (path 変更)

各 commit:

- 1 領域の mv のみ (vision / spec / guide / adr / archive 別)
- `git mv` で履歴を保持 (`git log --follow` で旧 path 追跡可能)
- broken link 一時発生は OK (commit 14 で一括 fix)

### Commit 6: 分割 (sensitive)

200 行超え doc:

| 旧 file                         | 行数 | 新分割                                                                |
| ------------------------------- | ---- | --------------------------------------------------------------------- |
| `dispatch-log.md`               | 3628 | (削除、commit 10)                                                     |
| `arcagate_mockup_board.jsx`     | 932  | `assets/mockups/board.jsx` (mv のみ、分割なし、binary 扱い)           |
| `ux_standards.md`               | 879  | `spec/ux-standards.md` (200) + `spec/ux-standards-{section}.md` × 3-4 |
| `foundation.md`                 | 834  | 内容精査 → `spec/` 数本 + `adr/` + 削除                               |
| `desktop_ui_ux_agent_rules.md`  | 537  | `spec/desktop-ui-rules.md` (200) + `spec/desktop-ui-rules-extra.md`   |
| `use-case-friction-v2.md`       | 500  | `plans/archive/architecture-analysis/` (archive 移動のみ、分割不要)   |
| `performance-baseline.md`       | 369  | `plans/archive/baselines/` (archive 移動のみ)                         |
| `arcagate-concept.md`           | 314  | `vision/concept.md` (200) + `vision/concept-extras.md`                |
| `design_system_architecture.md` | 283  | `spec/design-system.md` (200) + extras                                |
| `ux_design_vision.md`           | 242  | `vision/ux-design.md` (200) + extras                                  |
| `refactoring-opportunities.md`  | 215  | (削除、commit 10)                                                     |
| `pubkey-procedure.md`           | 207  | `guide/pubkey-procedure.md` (200) + 7 行 trim                         |

active 200 行超え 8 件のうち、6 件は分割 / 2 件は trim。

### Commit 7: ADR retro 化

各 ADR (0001-0005) は **本 reorg で初めて書く** (既存 doc 中の判断理由を抽出してまとめる):

| ADR                                      | 抽出元                                        | 内容                    |
| ---------------------------------------- | --------------------------------------------- | ----------------------- |
| 0001 Tauri v2 + Svelte 5                 | vision/concept.md / engineering-principles.md | stack 選定理由          |
| 0002 Mutex<Connection> 単一              | engineering-principles.md / lessons.md        | プール不採用理由        |
| 0003 No ORM (rusqlite + 生 SQL)          | engineering-principles.md                     | ORM 拒否理由            |
| 0004 Forward-only migrations             | release.yml / lessons.md                      | rollback 提供しない理由 |
| 0005 Tier 1 (minisign) + Tier 2 (cosign) | guide/pubkey-procedure / cosign-verification  | 2-tier 戦略             |

各 ADR 30-50 行、frontmatter (status: active, created, etc.) 必須。

### Commit 12: CLAUDE.md update

新 「いつ何を読むか」 table:

```markdown
| 状況           | 読む doc                                                   |
| -------------- | ---------------------------------------------------------- |
| プロダクト方針 | docs/vision/product.md                                     |
| 設計判断       | docs/vision/engineering-principles.md                      |
| UI / 視覚      | docs/spec/ux-standards.md, docs/spec/desktop-ui-rules.md   |
| テーマ         | docs/spec/design-system.md, docs/spec/industrial-yellow.md |
| バッチ         | docs/guide/dispatch-rules.md                               |
| 過去の失敗     | docs/lessons.md                                            |
| 過去の決定     | docs/adr/                                                  |
| 着手中 plan    | docs/plans/active/                                         |
| 完了 plan      | docs/plans/archive/                                        |
| 全体 index     | docs/llms.txt                                              |
```

CLAUDE.md 200 行制約遵守、不要箇所 trim。

### Commit 14: 退行検出 (必須)

```bash
# 1. broken link
grep -rE 'docs/[a-zA-Z][a-zA-Z0-9_-]*/' docs/ --include='*.md' | \
  awk -F: '{print $2}' | grep -oE 'docs/[^ )]*' | sort -u | while read p; do
    # docs/llms.txt 等 root file は exists check
    if [ ! -e "$p" ]; then
      echo "BROKEN: $p (referenced in some doc)"
    fi
  done

# 2. CLAUDE.md / memory/MEMORY.md / lessons.md からの link 整合性
for f in CLAUDE.md memory/MEMORY.md docs/lessons.md; do
  grep -oE 'docs/[a-zA-Z0-9_/-]+\.md' "$f" 2>/dev/null | while read p; do
    if [ ! -e "$p" ]; then
      echo "BROKEN in $f: $p"
    fi
  done
done

# 3. d4-deletes §退行検出 script を実行
```

すべて 0 hits で commit 14 確定 → PR 提出。

## 真ブロッカー候補 (user judgment 必要時に止まる)

判定で迷ったら止まる:

1. **`l2_foundation/foundation.md` 834 行の解体方針** — 内容精査で「spec / adr / 削除」 のどれに振るか個別判定必要
2. **ADR 0001-0005 の retro 抽出**: 既存 doc に判断理由が散在、抽出が agent 独断で「事実を捏造」 にならないか注意
3. **`l2_architecture/use-case-friction-v2.md` 500 行**: archive で残すか削除か (live で参照する場面あるか不明)

これら 3 点は D5 で発見次第、報告して user 判断を仰ぐ。

## 報告タイミング

- D4 完成 (本 plan): **本書、即 user 報告予定**
- D5 各 commit 進捗: 12-15 commit を一気に / progress milestone なし (1 PR で見せる)
- D5 完了: PR 提出時 / 退行検出 0 確認後 / user 受領

## 期待効果

| 指標                   | before                          | after                           | 改善   |
| ---------------------- | ------------------------------- | ------------------------------- | ------ |
| top-level dir 数       | 9 + 6 (l1 sub) = 15             | 5 (vision/spec/guide/adr/plans) | -67%   |
| 命名規則               | 3 種並走 (snake / kebab / 独自) | kebab 統一                      | 統一   |
| 200 行超え active doc  | 8 件                            | 0 件                            | -100%  |
| 同トピック散在         | 多 (例: pubkey 3 path)          | 1 トピック 1 file               | 解消   |
| broken link risk       | 高 (混在 path)                  | 低 (commit 14 で gate)          | 緩和   |
| LLM agent context cost | dispatch-log 3628 行 + 巨大 doc | 200 行制約 + llms.txt           | 削減   |
| archive 運用           | 暗黙                            | plans/archive/ + lifecycle 明文 | 明文化 |

D4 完了。D5 で実行開始。
