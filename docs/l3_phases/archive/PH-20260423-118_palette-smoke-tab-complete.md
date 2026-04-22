---
id: PH-20260423-118
title: palette.spec.ts — Tab キー補完テストに @smoke タグ追加
status: todo
batch: 26
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/palette.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

パレット（コマンドパレット）の Tab キー補完は中核機能だが、
対応するテストに `@smoke` タグがなく PR 時の E2E で検証されない。
workspace-editing に続き、パレットも smoke 対象に昇格させる。

## 実装内容

`tests/e2e/palette.spec.ts` 内の以下テストに `{ tag: '@smoke' }` を追加する。

- 「Tab キーで補完が適用されること」（または同等テスト名）

追加要件として、`cb:` プレフィックスによるクリップボード履歴表示テストを 1 件追加する:

1. パレットを開く
2. `cb:` と入力する
3. 結果リストに「Clipboard」または `cb:` 関連の候補が表示されること

## 受け入れ条件

- [ ] Tab 補完テストに `{ tag: '@smoke' }` が追加されていること
- [ ] `pnpm test:e2e --grep @smoke` でパレット関連テストが含まれること
- [ ] `cb:` プレフィックステストが追加・通過していること
