---
id: PH-20260424-208
title: Settings 2ペイン E2E テスト追加（batch-44 防衛）
status: todo
priority: medium
parallel_safe: true
scope_files:
  - tests/e2e/settings.spec.ts
depends_on: []
---

## 目的

batch-44（PR #74）で Settings を 2ペイン化（Obsidian 風カテゴリナビ）した。
退行防衛として E2E テストを追加する。

## 実装ステップ

### Step 1: settings.spec.ts に 2ペインナビゲーションテストを追加

確認内容:

1. Settings を開くと左ペインにカテゴリリスト（サウンド / テーマ / ワークスペース / ホットキー / インポート・エクスポート）が表示される
2. カテゴリをクリックすると右ペインに該当セクションが表示される
3. 別カテゴリをクリックすると切り替わる

```typescript
test('Settings 2ペインナビゲーション', { tag: '@smoke' }, async ({ page }) => {
  // Settings を開く
  // カテゴリリストが左ペインに表示されている
  // サウンド → テーマ の順でクリックし右ペインが切り替わることを確認
});
```

## 受け入れ条件

- [ ] Settings 画面で左ペインにカテゴリリストが表示される
- [ ] カテゴリクリックで右ペインが切り替わる
- [ ] `pnpm verify` 全通過（biome / svelte-check / vitest / cargo test）
- [ ] `pnpm test:e2e --grep @smoke` でテストがパスする
