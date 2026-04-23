---
id: PH-20260424-209
title: 組み込みテーマプリセット E2E テスト（batch-45 防衛）
status: done
priority: medium
parallel_safe: true
scope_files:
  - tests/e2e/settings.spec.ts
depends_on: []
---

## 目的

batch-45（PR #75）で Endfield / Ubuntu Frosted の組み込みテーマプリセットを追加した。
退行防衛として E2E テストを追加する。

## 実装ステップ

### Step 1: settings.spec.ts にテーマプリセット確認テストを追加

確認内容:

1. Settings > テーマ セクションに「Endfield」「Ubuntu Frosted」が選択肢として表示される
2. プリセット選択後にテーマ CSS 変数が変更される（`--ag-surface-0` 等）
3. アプリ再起動後も選択したプリセットが維持される

```typescript
test('テーマプリセット切替', async ({ page }) => {
  // Settings を開いてテーマセクションへ
  // Endfield プリセットをクリック
  // CSS 変数が変わることを evaluate で確認
});
```

## 受け入れ条件

- [ ] Settings テーマセクションに Endfield / Ubuntu Frosted が表示される
- [ ] プリセット選択後に CSS 変数が切り替わる
- [ ] `pnpm verify` 全通過
