---
status: todo
phase_id: PH-20260423-164
scope_files:
  - tests/e2e/workspace.spec.ts
parallel_safe: true
depends_on: []
---

# PH-20260423-164 E2E: Workspace ページタブ操作テスト追加

## 背景・目的

`PageTabBar` の `+ ページを追加` ボタンと `Chip`（ワークスペースタブ）の操作は
E2E テストで一切カバーされていない。
batch-34（PH-157/159）でこれらのコンポーネントに transition polish を追加したが、
クリック動作の自動保証がない。

## 実装仕様

`tests/e2e/workspace.spec.ts` に `ページタブ操作` describe を追加:

```typescript
test.describe('ページタブ操作', () => {
  test('+ ページを追加 でワークスペースが作成されること', async ({ page }) => {
    // + ページを追加 ボタンを取得してクリック
    const addButton = page.getByRole('button', { name: '+ ページを追加' });
    await expect(addButton).toBeVisible();

    // 現在のワークスペース数を記録
    const tabsBefore = await page.getByRole('button', { name: /workspace-tab/ }).count();

    await addButton.click();

    // テキスト入力フィールドが表示される
    const input = page.locator('input[placeholder="名前"]');
    await expect(input).toBeVisible();

    // ワークスペース名を入力して Enter
    await input.fill('テストページ');
    await input.press('Enter');

    // 新しい Chip が増えている
    await expect(page.getByTestId(/workspace-tab-/)).toHaveCount(tabsBefore + 1);
  });

  test('Esc キーでページ追加をキャンセルできること', async ({ page }) => {
    const addButton = page.getByRole('button', { name: '+ ページを追加' });
    await addButton.click();

    const input = page.locator('input[placeholder="名前"]');
    await expect(input).toBeVisible();

    await input.press('Escape');
    await expect(input).not.toBeVisible();
    // + ページを追加ボタンが再表示される
    await expect(addButton).toBeVisible();
  });
});
```

## 受け入れ条件

- [ ] `pnpm test:e2e` でページタブ関連テスト 2 件がパス
- [ ] `pnpm verify` 全通過

## 注意事項

- `data-testid="workspace-tab-{ws.id}"` は `PageTabBar.svelte` 内 `Chip` の `data-testid` 属性で取得可能
- `+ ページを追加` ボタンは `role="button"` でテキスト完全一致で取得
- E2E テストは Tauri CDP 経由のため、実際に IPC で `create_workspace` が呼ばれることを含む結合テスト
