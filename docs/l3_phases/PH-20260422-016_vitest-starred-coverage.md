---
status: todo
phase_id: PH-20260422-016
title: 品質防衛：items.svelte.ts vitest 追加（sys:starred + starredIds coverage）
depends_on:
  - PH-20260422-015
scope_files:
  - src/lib/state/items.svelte.test.ts
parallel_safe: true
---

# PH-20260422-016: vitest 追加（品質防衛）

## 目的

PH-20260422-013/015 で追加した sys:starred 関連ロジック（`starredItemIds` の管理、\
タグ変更後の再読み込み）は現在 vitest でカバーされていない。\
リグレッション防止のためユニットテストを追加する。\
既存の `items.svelte.test.ts` を参照してパターンを合わせる。

## 参照ファイル

- `src/lib/state/items.svelte.test.ts`（既存テストパターン）
- `src/lib/state/items.svelte.ts`（実装）

## 実装ステップ

### Step 1: 既存テスト構造の確認

`items.svelte.test.ts` を読み、mock 方法・テスト構造を把握する。

### Step 2: starredItemIds テスト追加

追加するテストケース:

1. `loadItems` 後に `starredItemIds` が Set として利用可能であること
2. `starredItemIds.has(id)` がスター付きアイテムで `true` を返すこと
3. `updateItem` でタグ変更後に `starredItemIds` が更新されること（`loadStarredIds` の再呼び出し）

### Step 3: pnpm verify（vitest を含む）

## コミット規約

`test(PH-20260422-016): items.svelte.ts の sys:starred / starredIds coverage 追加`

## 受け入れ条件

- [ ] items.svelte.test.ts に 3 件以上のテストが追加される
- [ ] `pnpm test`（vitest run）が全通過する
- [ ] `pnpm verify` 通過

## 停止条件

- mock 構造が大幅変更を要する → 停止して報告
