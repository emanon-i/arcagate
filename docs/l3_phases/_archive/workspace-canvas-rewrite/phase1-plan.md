# Phase 1 Plan: zoom math 書き直し

**Status**: Plan / **user sign-off 待ち** (実装は未着手)
**Scope**: zoom math + caller orchestration のみ。infinite plane 化 / DOM virtualization (Phase 2)、複数選択 (Phase 3) は触らない。
**Date**: 2026-05-04
**Predecessor**: [Phase 1 調査](./phase1-investigation.md) (7 file)
**user decision**: Q1〜Q5 全 agent 推奨で確定

## 0. user 確定仕様 (Q1-Q5)

| #  | 確定事項                                                                                      |
| -- | --------------------------------------------------------------------------------------------- |
| Q1 | **Wheel zoom anchor = mouse cursor** (Excalidraw / tldraw / Figma / Miro / Obsidian 業界標準) |
| Q2 | **`configStore.setWidgetZoom` に clamp 残す** (`clampZoom()` 経由、defense in depth)          |
| Q3 | **`WorkspaceLayout.computeInitialScroll` を Phase 1 で `computeFitScroll` と統一** (重複解消) |
| Q4 | **Fit / Reset の scroll は `behavior: 'instant'`** (smooth 撤廃で timing race 排除)           |
| Q5 | **Settings 表示の zoom 値は `Math.round` raw 値** (5 単位丸め撤廃)                            |

## 1. Plan 構成 (200 行制約のため 5 file 分割)

| File                                                             | 内容                                            |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| [phase1-plan.md](./phase1-plan.md) (この file)                   | TOP / spec 確定 / sign-off section              |
| [phase1-plan-1-spec.md](./phase1-plan-1-spec.md)                 | 最終 spec (動作仕様 / 数値 / state model)       |
| [phase1-plan-2-commits.md](./phase1-plan-2-commits.md)           | commit 単位の実装手順 (8 commit)                |
| [phase1-plan-3-verification.md](./phase1-plan-3-verification.md) | 各 commit の test 実行内容 + 退行 risk matrix   |
| [phase1-plan-4-pr-rollback.md](./phase1-plan-4-pr-rollback.md)   | branch / PR 構成 / 検収シナリオ / rollback 手順 |

## 2. 高レベル流れ (実装フェーズ)

```
0. main から fix/zoom-rewrite-phase1 を切る
1. stash@{0} pop + main との conflict 解消         [commit 1: chore]
2. zoom-math.ts に anchor 引数追加                  [commit 2: feat (math)]
3. zoom-math.test.ts を 2 file 分割 + cursor test  [commit 3: test (unit)]
4. widget-zoom.svelte.ts cursor anchor 実装        [commit 4: refactor (zoom orch)]
5. config.svelte.ts clamp 統一                      [commit 5: refactor (config)]
6. WorkspaceLayout.computeInitialScroll 統一       [commit 6: refactor (layout)]
7. e2e test 修正 (50→25) + 3 ケース追加            [commit 7: test (e2e)]
8. ux_standards.md §13 spec 追記                    [commit 8: docs]

→ 全 8 commit、~7 file 変更、+650 / -50 行想定
→ pnpm verify 全 pass + 実機 CDP 5 シナリオ screenshot + Codex 二次レビュー
→ 1 PR (squash merge)
```

## 3. user sign-off チェックリスト

実装着手前に確認:

- [ ] §0 の Q1-Q5 確定事項に異議なし (= この Plan が user 仕様と一致)
- [ ] [phase1-plan-1-spec.md](./phase1-plan-1-spec.md) の 動作仕様 9 項目 を読了
- [ ] [phase1-plan-2-commits.md](./phase1-plan-2-commits.md) の commit 8 件 を確認
- [ ] [phase1-plan-3-verification.md](./phase1-plan-3-verification.md) の risk matrix を確認 (8 risk が test/screenshot で潰せる)
- [ ] [phase1-plan-4-pr-rollback.md](./phase1-plan-4-pr-rollback.md) の検収シナリオ 5 件を確認
- [ ] **rollback 手順** (PR revert で戻る) を確認

→ 全 sign-off で実装着手。

## 4. 重要な注意事項

- **「DOM 存在 = 治った」判定禁止**: pnpm verify pass + screenshot + 動作確認 + Codex 二次レビュー の四点セット
- **Codex「RELEASE-READY」判定は信用しない**: 最終 OK は user dev 検収のみ
- **Phase 2/3 領域に手を出さない**: DOM grid / canvas size 計算 / 配置 algorithm / 複数選択は Phase 1 で不変
- **stash@{0} を変更前に必ず確認**: pop 前に main の最新 commit (PR #281 反映後) と conflict があれば resolve

## 5. ブロッカー / 懸念

なし。Q1-Q5 確定で必要情報は全て揃っている。実装着手可能。
