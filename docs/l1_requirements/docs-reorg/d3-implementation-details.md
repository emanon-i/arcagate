# D3 implementation details (sections 8-12)

**Status**: 2026-05-06、d3-arcagate-doc-system.md (sections 1-7) の続編
**Method**: 200 行制約のため D3 を 2 file に分割

→ 本体は [d3-arcagate-doc-system.md](./d3-arcagate-doc-system.md) を参照。本書は §8-12 を担当。

## 8. 検索性 / agent navigation

### llms.txt root index (新規)

```
# Arcagate

Personal launcher consolidating PC-wide entry points. Tauri v2 + SvelteKit + Rust + SQLite.

## Vision
- [Product vision](vision/product.md): release goal / milestones
- [Engineering principles](vision/engineering-principles.md): layer / IPC / error patterns
- [Visual language](vision/visual-language.md)
- [Concept](vision/concept.md)

## Specs (live reference)
- [UX standards](spec/ux-standards.md)
- [Design system](spec/design-system.md)
- [Industrial Yellow](spec/industrial-yellow.md)
- [Desktop UI rules](spec/desktop-ui-rules.md)
- [Release criteria](spec/release-criteria.md)
- [Widget add checklist](spec/widget-add-checklist.md)

## Guides (how-to)
- [Pubkey procedure](guide/pubkey-procedure.md): updater minisign Tier 1
- [Cosign verification](guide/cosign-verification.md): distribution attestation Tier 2
- [Microsoft Store](guide/microsoft-store.md): Store submission flow
- [Dispatch rules](guide/dispatch-rules.md): batch operation
- [Distribution rollback](guide/distribution-rollback.md): SOP
- [Support](guide/support.md): user FAQ

## Decisions (ADR)
- [ADR index](adr/) — append-only architecture decisions

## Active plans
- [docs-reorg](plans/active/docs-reorg/) — current

## Lessons
- [Lessons](lessons.md) — failure-driven memory
```

### grep 友好性

- ファイル名は **topic + type を表現する名詞** (`pubkey-procedure.md` で「pubkey」「procedure」 双方 grep hit)
- archive は **元 path 保持** (例: `plans/archive/release-readiness-r6/audit-final-r6.md`)、grep で過去 audit を即発見

## 9. 200 行制約への対応

**分割例** (D4 で具体化):

- `dispatch-log.md` 3628 行 → 削除 (git 履歴に逃がす、live update 不要)
- `ux_standards.md` 879 行 → `spec/ux-standards.md` (本体 200 行) + `spec/ux-standards-{section}.md` 数本
- `desktop_ui_ux_agent_rules.md` 537 行 → `spec/desktop-ui-rules.md` (200 行) + `spec/desktop-ui-rules-extra.md` (rest)
- `l2_foundation/foundation.md` 834 行 → 内容調査して `spec/` 系 + `adr/` 系に解体 or 削除
- `arcagate_mockup_board.jsx` 932 行 + mock PNG → `assets/` 移動 (docs 範囲外、`vision/` から link)

## 10. 削除運用 (古い doc は git に逃がす)

**user 明示**: 「古い内容は全部消して OK (git に残るから)」

削除対象判定 (D4 で全件 list):

1. 完全に superseded (例: `audit-final.md` ← R6 audit で superseded、本体は live)
2. 重複 (例: `distribution-readiness.md` と `distribution/microsoft-store.md`)
3. snapshot / 一時 (例: `dispatch-log.md` 3628 行、`l2_architecture/codex-review-2026-04-25.md`)
4. 巨大かつ live update が無いもの → archive 行きでなく削除

「reference 価値あり」 と判定したら archive へ、それ以外は削除。

## 11. 設計の検証チェックリスト

| 検証項目                                    | 結果                                                |
| ------------------------------------------- | --------------------------------------------------- |
| D1 痛み 1 (命名 3 種並走) → 解消?           | ✅ kebab-case 統一                                  |
| D1 痛み 2 (l0/l1/l2/l3 階層乖離) → 解消?    | ✅ vision/spec/guide/adr/plans 5 種に再構成         |
| D1 痛み 3 (archive 暗黙) → 明文化?          | ✅ §6 lifecycle 表 + plans/archive/                 |
| D1 痛み 4 (同トピック散在) → 解消?          | ✅ 1 トピック 1 file 原則、cross-link で接続        |
| D1 痛み 5 (300+ 行 doc) → 200 行制約?       | ✅ §9 分割計画                                      |
| D1 痛み 6 (古い rN 残置) → 整理?            | ✅ live は最新 + plans/archive へ移動               |
| D1 痛み 7 (重複 doc) → 統合?                | ✅ D4 で具体 list 化                                |
| D1 痛み 8 (PNG / JSX が docs/ 直下) → 分離? | ✅ assets/ 提案                                     |
| 200 行制約 (本書自体)                       | ✅ 全 D1-D5 doc 200 行以内 (本書は分割で達成)       |
| LLM agent friendly                          | ✅ flat 2 階層 / kebab / llms.txt / frontmatter ≤ 8 |
| 1 person + agent 規模                       | ✅ RFC ceremony 排除、ADR + plans で十分            |

## 12. D4 への引き継ぎ

D4 で以下を確定する:

1. 既存 全 active doc (~94 件) の **新 path mapping 表** (移動 / 統合 / 分割 / 削除)
2. 既存 archive (~506 件) の **plans/archive/ への合流計画**
3. 新規作成すべき doc list (ADR retro 化、llms.txt、README、guide/dispatch-rules.md ←旧 dispatch-operation.md 流用 等)
4. CLAUDE.md / memory/MEMORY.md 更新案
5. 実行順序 (branch 戦略 / commit 単位 / 退行検出 script)
