---
id: PH-20260425-276
status: todo
batch: 64
type: 品質防衛
---

# PH-276: ウィジェット設定変更 → 即時反映 E2E 機械化

## 参照した規約

- `arcagate-engineering-principles.md` §6 SFDIPOT: Function / Time 観点
- `arcagate-engineering-principles.md` §4 テスト: 観点主導テスト・@smoke タグ

## 背景・目的

「設定を変えたら即見た目が変わるか」のテストが存在しなかったため、PH-275 で修正した即時反映が regression で壊れても気づけない。機械的に検出できるようにする。

## 作業内容

### 対象テストシナリオ（全 @smoke 推奨）

#### Quick Note

```typescript
test('QuickNote: フォントサイズ設定が即時反映される', async () => {
  // 1. ウィジェット設定を開く
  // 2. fontSize を 'lg' に変更
  // 3. ダイアログを閉じる（or onChange でリアルタイム）
  // 4. textarea の CSS font-size が変わっていることを確認
});

test('QuickNote: textarea がウィジェット高さを埋める', async () => {
  // widgetHeight を変更してコンテンツが追従するか確認
  // または DOM getBoundingClientRect で高さを比較
});
```

#### Item Widget

```typescript
test('ItemWidget: displayMode 設定が即時反映される', async () => {
  // 設定変更 → ウィジェット切替なしで DOM が更新されることを確認
});
```

#### Clock Widget

```typescript
test('ClockWidget: サイズ設定が即時反映される', async () => {
  // font-size やレイアウトの変化を確認
});
```

### 実装方針

- Playwright の `page.evaluate` で DOM サイズ取得（`getBoundingClientRect`）
- CSS custom property の変化を確認（`getComputedStyle`）
- タイムアウトは短く（即時反映なので500ms以内）

## 成果物

- `tests/e2e/widget-config-live.spec.ts`（新設）
  - Quick Note フォントサイズ即時反映テスト
  - Quick Note コンテンツ高さ追従テスト
  - Item Widget displayMode 即時反映テスト
  - Clock サイズ即時反映テスト

## 受け入れ条件

- [ ] 設定変更 → 500ms 以内に DOM が更新されることを E2E で確認 [Time]
- [ ] コンテンツ高さ追従を DOM サイズ計測で確認 [Function]
- [ ] `@smoke` タグ付きテストが `pnpm test:e2e` で通過
- [ ] `pnpm verify` 全通過
