---
id: PH-20260423-137
title: lessons.md 更新（batch-28 知見記録）
status: done
batch: 29
priority: low
created: 2026-04-23
scope_files:
  - docs/lessons.md
parallel_safe: true
depends_on: []
---

## 背景/目的

batch-28 で発見した以下の知見を `docs/lessons.md` に記録する:

1. **Playwright expect.timeout デフォルト 5s 問題**
   - CI Windows runner で非同期 IPC チェーンが 5s を超えることがある
   - `playwright.config.ts` に `expect.timeout: 10_000` を明示すべき
   - 症状: `toBeVisible()` / `not.toBeVisible()` が CI のみで失敗

2. **@smoke テスト選定基準**
   - 複数の非同期 IPC を連鎖するテストは @smoke に不向き
   - @smoke は「クリック → 即座に DOM 変化」または「シンプルな DOM アサーション」に限定
   - 複雑な IPC 連鎖テストは nightly のみで運用

3. **starredIds 更新の 2段階非同期チェーン**
   - LibraryMainArea の starredIds 更新: `updateItem` IPC → `items` 更新 →
     `$effect` 起動 → `searchItemsInTag` IPC → `starredIds` 更新
   - この連鎖は CI で 5〜10s かかる場合があり、短い timeout では失敗する

## 実装内容

`docs/lessons.md` の末尾（または適切なセクション）に上記 3 点を追記する。

## 受け入れ条件

- [ ] `docs/lessons.md` に上記 3 点が記録されること
- [ ] dprint fmt 通過
