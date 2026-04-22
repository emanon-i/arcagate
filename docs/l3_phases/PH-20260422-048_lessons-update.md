---
id: PH-20260422-048
title: lessons.md 更新（Batch 7/8 知見 3 件追加）
status: done
batch: 9
priority: low
created: 2026-04-22
---

## 背景/目的

Batch 7/8 の実装中に判明した落とし穴・パターンを `docs/lessons.md` に記録し、
同じミスを繰り返さないようにする。

## 追加した知見

| # | カテゴリ                                        | 内容                                                              |
| - | ----------------------------------------------- | ----------------------------------------------------------------- |
| 1 | shadcn/ag-* CSS                                 | PH-043 完了後の状態 + Tailwind v4 opacity modifier（color-mix）注 |
| 2 | UI 変更でテストが壊れるパターン                 | UX フロー変更時は E2E テストも同時更新する                        |
| 3 | CSS トークン未定義は pnpm verify で検出されない | rgba フォールバック動作の罠                                       |
| 4 | アーカイブ時の git add -u 漏れ                  | mv 後は `git add -u docs/l3_phases/` が必要                       |

## 受け入れ条件

- [x] 4 件の知見が lessons.md に追記されていること
- [x] `pnpm verify` 全通過
