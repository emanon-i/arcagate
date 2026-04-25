---
id: PH-20260425-293
status: todo
batch: 67
type: 防衛
---

# PH-293: Library UX 機械化（per-card override / ⭐ボタン / タグ UI / 可視切替 / 左パネル罫線）

## 参照した規約

- `arcagate-engineering-principles.md` §6 テストピラミッド
- `lessons.md`: @smoke 選定基準（IPC 連鎖最小）
- batch-66 PH-288 の E2E 構造を踏襲

## テスト観点（SFDIPOT）

- **F**: ⭐ toggle / 可視切替 / per-card override が DB 反映
- **D**: 左パネル 4 セクション分離が DOM に存在
- **I**: per-card override JSON が IPC 境界で正しく shape
- **O**: タグ追加が UI から実行可能
- **P**: アイコン rendering が背景モードで一貫

## テストケース

### 1. ⭐ お気に入りボタンが toggle する @smoke

```typescript
test('お気に入りボタン toggle で is_starred が DB 反映', { tag: '@smoke' }, async ({ page }) => {
    const item = await createItem(page, { item_type: 'url', label: 'fav-test', target: 'https://x.com' });
    // LibraryCard クリックで詳細パネル開く
    await page.getByTestId(`library-card-${item.id}`).click();
    // お気に入りボタン押す
    const favBtn = page.getByRole('button', { name: 'お気に入り' });
    await favBtn.click();
    // ★ バッジが表示
    await expect(page.locator(`[data-testid="library-card-${item.id}"] [data-testid="starred-badge"]`)).toBeVisible();
});
```

### 2. ライブラリで非表示チェックで grayscale 表示 @smoke

```typescript
test('可視/不可視切替でグレースケール表示', { tag: '@smoke' }, async ({ page }) => {
    const item = await createItem(page, { ... });
    await page.getByTestId(`library-card-${item.id}`).click();
    await page.getByLabel('ライブラリで非表示').check();
    const card = page.getByTestId(`library-card-${item.id}`);
    const opacity = await card.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.5);
});
```

### 3. 左パネル 4 セクション罫線

```typescript
test('LibrarySidebar が 4 セクション + 罫線で分離', async ({ page }) => {
    const sidebar = page.getByTestId('library-sidebar');
    const sections = sidebar.locator('[data-testid^="sidebar-section-"]');
    expect(await sections.count()).toBeGreaterThanOrEqual(3); // 全体 + システム + ユーザー（+ workspace）
});
```

### 4. per-card override IPC

```typescript
test('cmd_update_item で card_override_json を保存・取得', async ({ page }) => {
    const item = await createItem(page, { ... });
    const overrideJson = JSON.stringify({ background: { focalY: 25 } });
    await invoke(page, 'cmd_update_item', { id: item.id, input: { card_override_json: overrideJson } });
    const updated = await invoke<{ card_override_json: string | null }>(page, 'cmd_list_items');
    // 該当 item の card_override_json が JSON.parse すると focalY:25 を含む
});
```

### 5. タグ追加 UI が機能

```typescript
test('「+ タグを追加」ボタンでタグ picker が開く', async ({ page }) => {
    // ...
    await page.getByRole('button', { name: '+ タグを追加' }).click();
    await expect(page.getByRole('combobox', { name: 'タグ候補' })).toBeVisible();
});
```

## 受け入れ条件

- [ ] テスト 5 ケース緑（ローカル + CI）
- [ ] @smoke は 2 ケース（⭐ / 可視切替）
- [ ] `pnpm verify` 全通過

## 自己検証

- E2E 全件緑
- @smoke の追加で 30 → 32 件、CI 1200s 上限内に収まる
