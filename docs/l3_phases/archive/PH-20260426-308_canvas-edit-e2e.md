---
id: PH-20260426-308
status: done
batch: 70
type: 防衛
---

# PH-308: Workspace 編集モード E2E + visual regression

## 横展開チェック実施済か

- 既存 `tests/e2e/workspace-editing.spec.ts` のパターン踏襲
- lessons.md「Playwright PointerEvent と page.mouse の競合」回避（page.evaluate dispatch ベース）
- `afterEach` で `page.mouse.up()` 必須（マウス占有事故防止、batch-16 の教訓）
- `globalTimeout` は CI で 1200s 維持

## テストケース

### 1. ミドルクリックパン

```typescript
test('編集モード中の middle-button drag で canvas が pan', async ({ page }) => {
    await enterEditMode(page);
    const canvas = page.locator('[data-testid="workspace-canvas"]');
    const before = await canvas.evaluate((el) => el.scrollLeft);
    await page.evaluate(() => {
        const el = document.querySelector('[data-testid="workspace-canvas"]') as HTMLElement;
        const mk = (type: string, button: number, x: number, y: number) =>
            new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', button, clientX: x, clientY: y });
        el.dispatchEvent(mk('pointerdown', 1, 100, 100));
        el.dispatchEvent(mk('pointermove', 1, 200, 100));
        el.dispatchEvent(mk('pointerup', 1, 200, 100));
    });
    const after = await canvas.evaluate((el) => el.scrollLeft);
    expect(after - before).toBeLessThan(0); // scroll が動いた
});
```

### 2. Space + drag pan

似た形、button=0 + space modifier。

### 3. 8 ハンドル全方向 resize

```typescript
test.describe('8 ハンドル resize', () => {
    for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
        test(`${dir} ハンドルで resize @smoke`, async ({ page }) => {
            // 該当ハンドル取得 → PointerEvent dispatch → サイズ変化確認
        });
    }
});
```

@smoke 化は 1 方向のみ（se が代表）。

### 4. cursor 変化

```typescript
test('Space 押下で canvas cursor が grab', async ({ page }) => {
    await enterEditMode(page);
    await page.keyboard.down('Space');
    const cursor = await page.locator('[data-testid="workspace-canvas"]').evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toMatch(/grab/);
    await page.keyboard.up('Space');
});
```

### 5. ホバー toolbar の表示

```typescript
test('選択 widget の hover で 設定 + 削除 toolbar が出る', async ({ page }) => {
    // ...
});
```

### 6. visual regression（任意）

`expect(page).toHaveScreenshot('workspace-edit-mode.png')` で baseline 保存 + diff。

### 7. afterEach guard

```typescript
test.afterEach(async ({ page }) => {
    await page.mouse.up().catch(() => {});
    await page.keyboard.up('Space').catch(() => {});
});
```

## 受け入れ条件

- [ ] テスト 6 ケース緑（ローカル + CI）
- [ ] @smoke は 1 件（se ハンドル resize）
- [ ] visual regression baseline が tmp/playwright-report に保存
- [ ] `pnpm verify` 全通過
