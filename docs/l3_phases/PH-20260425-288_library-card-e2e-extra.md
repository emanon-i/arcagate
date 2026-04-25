---
id: PH-20260425-288
status: todo
batch: 66
type: 防衛
---

# PH-288: メタデータ + LibraryCardSettings の追加 E2E

## 参照した規約

- `arcagate-engineering-principles.md` §6 テストピラミッド（観点主導）
- `lessons.md` の Playwright 関連（@smoke 選定基準）

## 背景・目的

PH-285 で導入する Rust IPC + LibraryCard メタデータ表示、PH-286 の snippet 抽出後の Settings UI、PH-287 で取り込む codex 指摘修正、これらを E2E で機械化して回帰防衛。

## テスト観点（SFDIPOT）

- **F**: メタデータが item_type 別に正しい型で表示される
- **D**: S/M/L で表示量が変わる（S: なし / M: 1 行 / L: 2 行）
- **I**: cmd_get_item_metadata の IPC 境界（型が serializer / deserializer で round-trip）
- **O**: ユーザが Settings > Library で全 picker / slider を操作 → 即時反映
- **T**: メタデータ取得が UI を 16ms 以上 block しない（lazy fetch）

## テストケース

### 1. メタデータ表示（folder アイテム）@smoke

```typescript
test('folder アイテムでメタデータ（中の数 + 合計サイズ）が L サイズで表示', { tag: '@smoke' }, async ({ page }) => {
  // tmp folder を IPC で作成 + 子ファイル 3 個 + Library 登録
  // size = 'L' に切替
  // CDP で .library-card__label 内のテキストを取得し、"3 items" / "X KB" を含むか確認
});
```

### 2. Settings > Library 全 picker / slider が機能（@smoke 化）

```typescript
test('Settings > Library で全色 picker / slider が即時反映', { tag: '@smoke' }, async ({ page }) => {
  // Settings > ライブラリ を開く
  // 各 picker / slider を変更
  // localStorage の libraryCard が更新される
  // LibraryCard の inline style に反映される
});
```

### 3. 背景モード切替時のレンダー速度

```typescript
test('背景モード切替が 100ms 以内に DOM 反映', async ({ page }) => {
  const t0 = await page.evaluate(() => performance.now());
  // モード切替
  await page.locator('[data-testid="library-bg-mode-fill"]').click();
  // 反映確認
  await page.waitForFunction(() => /* ... */);
  const t1 = await page.evaluate(() => performance.now());
  expect(t1 - t0).toBeLessThan(100);
});
```

### 4. メタデータ N+1 防止

```typescript
test('100 アイテムでも cmd_get_item_metadata が item ごと 1 回のみ', async ({ page }) => {
  // 100 アイテム作成
  // window.__ipcCallCounts を hook して cmd_get_item_metadata の呼び出し回数を測る
  // 100 を超えない
});
```

## 受け入れ条件

- [ ] テスト 4 ケース緑（CI + ローカル）
- [ ] @smoke は 2 ケース（folder メタデータ + Settings 全操作）
- [ ] N+1 IPC テストで実装の保証
- [ ] `pnpm verify` 全通過

## 自己検証

- E2E 実行で全件緑
- `pnpm test:e2e --grep @smoke` の実行時間がベースラインから 30s を超えない
