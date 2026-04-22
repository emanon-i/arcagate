---
status: done
phase_id: PH-20260422-032
title: Workspace ウィジェット削除 E2E テスト追加
depends_on: []
scope_files:
  - tests/e2e/workspace-editing.spec.ts
parallel_safe: true
---

# PH-20260422-032: Workspace ウィジェット削除 E2E テスト追加

## 目的

`workspace-editing.spec.ts` には D&D 追加・移動・リサイズのテストがあるが、
削除（ゴミ箱ボタン）のテストが欠落している。
削除機能はユーザーが頻繁に使う操作であり、リグレッション防衛が必要。

## 現状

```
tests/e2e/workspace-editing.spec.ts:
  ✓ D&D でウィジェットを追加
  ✓ ドラッグハンドルで移動
  ✓ リサイズハンドルでサイズ変更
  ✗ ウィジェット削除（テストなし）
```

## 実装ステップ

### Step 1: 既存 workspace-editing.spec.ts の末尾に削除テスト追加

削除ボタンの `aria-label="ウィジェットを削除"` を使用:

```typescript
test('編集モードでゴミ箱ボタンをクリックするとウィジェットが削除されること', async ({ page }) => {
    await resizeWindow(page, 1280, 800);
    
    // Workspace タブに切り替え
    // ...
    
    // 編集モードに入る
    // ...
    
    // 削除前のウィジェット数を確認
    // ゴミ箱ボタンをクリック
    await page.getByRole('button', { name: 'ウィジェットを削除' }).first().click();
    
    // ウィジェット数が減ったことを確認
    // ...
});
```

### Step 2: pnpm verify（既存テスト含む）

## コミット規約

`test(PH-20260422-032): Workspace ウィジェット削除 E2E テスト追加`

## 受け入れ条件

- [x] `pnpm verify` 通過
- [x] 削除テストが GREEN であること
- [x] 既存 workspace-editing.spec.ts の 3 テストが引き続き GREEN であること

## 停止条件

- 削除ボタンがテスト環境（WebView2 CDP）から操作できない → 原因調査して報告
- 既存テストが 1 本以上失敗 → まず既存の失敗を修正してから続行
