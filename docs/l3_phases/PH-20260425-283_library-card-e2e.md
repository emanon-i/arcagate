---
id: PH-20260425-283
status: todo
batch: 65
type: 防衛
---

# PH-283: Library カード仕様 E2E（CDP computed style + S/M/L + gap + focal point）

## 参照した規約

- `arcagate-engineering-principles.md` §6 テストピラミッド（E2E は CDP 経由、@smoke 選定基準）
- `lessons.md`: Playwright 関連の落とし穴（getByText 部分一致、`waitForTimeout` 禁止、@smoke 基準）
- `feedback_self_verification.md`: テスト緑だけでは「直った」と言わない

## 背景・目的

PH-280〜282 で実装した Library カード仕様を **機械的に強制**する。CSS 変更は型チェックや lint で検出できない（lessons.md「CSS トークンの未定義は pnpm verify で検出されない」参照）。
過去の Plan で「コードレビューで OK」と言って実機で違ってた事例があるため、テストで CSS computed value を直接確認する。

## テスト観点（SFDIPOT）

- **F Function**: S/M/L 切替で width×height が変わる、背景モード切替で表示が変わる
- **D Data**: `gap`, `gridTemplateColumns`, `aspect-ratio` が仕様値と一致
- **I Interface**: configStore ↔ DOM の経路（即時反映）
- **P Platform**: CDP でも DOM が壊れていない
- **O Operations**: ウィンドウ resize で列数変動

## 受け入れオラクル（HICCUPPS）

- **C Claims**: PR #97 close 理由（4:3 / gap-4 / カード全体可変）と一致
- **P Purpose**: ユーザ確定仕様通り
- **U User**: 設定変更が即反映で迷わない

## テストケース

### 1. S/M/L 切替でカード width が変わる（@smoke）

`tests/e2e/library-card-spec.spec.ts`

```typescript
test('S/M/L 切替で LibraryCard width が仕様通りに変わる @smoke', async ({ page }) => {
  // 事前にアイテムを 1 件作成
  // configStore.libraryCard.size = 'S'
  await page.evaluate(() => localStorage.setItem('arcagate-library-card', JSON.stringify({ size: 'S', /* defaults */ })));
  await page.reload();
  const card = page.locator('[data-testid^="library-card-"]').first();
  const sWidth = await card.evaluate((el) => el.getBoundingClientRect().width);
  expect(sWidth).toBeCloseTo(144, 0);

  // M
  await page.evaluate(() => localStorage.setItem('arcagate-library-card', JSON.stringify({ size: 'M' })));
  await page.reload();
  const mWidth = await card.evaluate((el) => el.getBoundingClientRect().width);
  expect(mWidth).toBeCloseTo(192, 0);

  // L
  await page.evaluate(() => localStorage.setItem('arcagate-library-card', JSON.stringify({ size: 'L' })));
  await page.reload();
  const lWidth = await card.evaluate((el) => el.getBoundingClientRect().width);
  expect(lWidth).toBeCloseTo(256, 0);
});
```

### 2. aspect-ratio が 4:3 である（@smoke）

```typescript
test('LibraryCard aspect-ratio が 4:3 @smoke', async ({ page }) => {
  const card = page.locator('[data-testid^="library-card-"]').first();
  const { w, h } = await card.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  expect(w / h).toBeCloseTo(4 / 3, 2);
});
```

### 3. gap が 16px 固定（S/M/L で不変）（@smoke）

```typescript
test('LibraryGrid gap は S/M/L で 16px 固定', async ({ page }) => {
  const grid = page.locator('.library-grid');
  for (const size of ['S', 'M', 'L']) {
    await page.evaluate((s) => localStorage.setItem('arcagate-library-card', JSON.stringify({ size: s })), size);
    await page.reload();
    const gap = await grid.evaluate((el) => getComputedStyle(el).rowGap);
    expect(gap).toBe('16px');
  }
});
```

### 4. ウィンドウ resize で列数が変わってもカード幅不変

```typescript
test('window resize でカード幅は不変、列数のみ変動', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  const card = page.locator('[data-testid^="library-card-"]').first();
  const w800 = await card.evaluate((el) => el.getBoundingClientRect().width);
  await page.setViewportSize({ width: 1600, height: 600 });
  const w1600 = await card.evaluate((el) => el.getBoundingClientRect().width);
  expect(w1600).toBeCloseTo(w800, 0);
});
```

### 5. 背景モード切替（image / fill / none）

```typescript
test('background mode 切替で DOM 構造が変わる', async ({ page }) => {
  // mode='image' → <img> が存在
  // mode='fill'  → <img> なし、bg color あり
  // mode='none'  → <img> なし、bg なし
});
```

### 6. focal point スライダーで object-position が変わる（image モード）

```typescript
test('focal point 変更で object-position が反映', async ({ page }) => {
  // libraryCard.background.focalX = 75 を localStorage に保存 → reload
  const img = page.locator('[data-testid^="library-card-"] img').first();
  const pos = await img.evaluate((el) => getComputedStyle(el).objectPosition);
  expect(pos).toContain('75%');
});
```

## 作業内容

- `tests/e2e/library-card-spec.spec.ts` 新規作成
- `@smoke` タグは「軽量・短時間（IPC 連鎖最小）」に絞る（lessons.md「@smoke テスト選定基準」参照）
- afterEach で Settings ダイアログ残存ガード（lessons.md batch-50）
- `expect.timeout: 10_000` 維持（既存設定通り）

## 受け入れ条件

- [ ] 全 6 ケース緑（ローカル + CI）
- [ ] @smoke タグ付与は 3 ケース（S/M/L width / 4:3 / focal point）に限定
- [ ] CDP 接続安定（worker-scoped fixture 既存パターン踏襲）
- [ ] PR で `pnpm test:e2e --grep @smoke` を実行して緑確認
- [ ] `pnpm verify` 全通過
