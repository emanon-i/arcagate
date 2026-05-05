---
id: PH-20260422-095
title: E2E テスト追加（Esc キャンセル / Enter 起動）
status: done
batch: 20
priority: medium
created: 2026-04-22
parallel_safe: false
scope_files:
  - tests/e2e/workspace-editing.spec.ts
  - tests/e2e/palette.spec.ts
  - tests/e2e/library-detail.spec.ts
---

## 背景/目的

PH-092（Workspace Esc キャンセル）、PH-093（Palette クリアボタン）、PH-094（Library Enter 起動）
の実装を E2E テストでカバーする。実装確認のみならず、将来のリグレッション防止が目的。

## 修正内容

### workspace-editing.spec.ts — Esc キャンセルテスト追加

```typescript
test('編集モード中に Esc を押すと編集モードが終了すること', async ({ page }) => {
    // 編集モードに入る（右クリックメニューまたはボタン経由）
    // Esc を押す
    await page.keyboard.press('Escape');
    // 編集モードが終了していることを確認
    await expect(page.getByRole('group')).not.toBeVisible();
});
```

### palette.spec.ts — クリアボタンテスト追加

```typescript
test('クエリ入力後に X ボタンが表示され、クリックするとクリアされること', async ({ page }) => {
    // パレットを開く
    // クエリを入力する
    // X ボタンが表示されることを確認
    // X ボタンをクリックする
    // クエリがクリアされることを確認
});
```

### library-detail.spec.ts — Enter 起動テスト追加

```typescript
test('DetailPanel 表示中に Enter キーでアイテムが起動されること', async ({ page }) => {
    // アイテム詳細パネルを開く
    // Enter キーを押す
    // トースト「〜 を起動しました」が表示されることを確認
});
```

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] workspace-editing: Esc で編集モード終了するテストが追加されること
- [ ] palette: X ボタン表示・クリアテストが追加されること
- [ ] library-detail: Enter 起動テストが追加されること
