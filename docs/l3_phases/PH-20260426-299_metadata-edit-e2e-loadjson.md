---
id: PH-20260426-298
status: todo
batch: 68
type: 防衛
---

# PH-298: メタデータ拡張 + per-card 編集 E2E

## 参照した規約

- `arcagate-engineering-principles.md` §6 テストピラミッド
- `lessons.md`: @smoke 選定基準

## テストケース

### 1. image アイテムで dimensions が表示

```typescript
test('image アイテムで cmd_get_item_metadata が dimensions を返す @smoke', async ({ page }) => {
    // tmp に PNG ファイル作成 → item 登録 → IPC 呼ぶ
    // imageDimensions が [w, h] を返す
});
```

### 2. exe アイテムで version が表示

### 3. per-card 編集モード ON で focal point スライダーが出現

### 4. per-card 編集 → 適用 → カードに即時反映

### 5. ナビ整合: 本体 Library tab icon と Settings Library icon が一致

```typescript
test('本体 Library tab icon と Settings Library icon が一致', async ({ page }) => {
    const titleLibrary = await page.getByRole('button', { name: 'Library' }).first().locator('svg').getAttribute('class');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Library' }).click();
    // 同じ lucide icon class（lucide-archive 等）が含まれる
});
```

## 受け入れ条件

- [ ] テスト 5 ケース緑
- [ ] @smoke は 2 件（image dimensions + ナビ整合）
- [ ] `pnpm verify` 全通過
