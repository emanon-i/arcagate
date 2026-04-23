---
status: done
phase_id: PH-20260423-189
title: E2E: Workspace タブダブルクリックでリネームダイアログが開く退行防衛テスト
category: 防衛
scope_files:
  - tests/e2e/workspace-editing.spec.ts
parallel_safe: true
depends_on: [PH-20260423-185]
---

## 目的

PH-185 で実装した「アクティブタブのダブルクリックで WorkspaceRenameDialog を開く」機能の退行防衛 E2E テストを追加する。

## テスト仕様

```typescript
test('ワークスペースタブをダブルクリックするとリネームダイアログが開くこと（PH-185 退行防衛）',
  { tag: '@smoke' },
  async ({ page }) => {
    // 1. ワークスペースを作成
    // 2. Workspace タブを表示（タブバーに表示されるまで待機）
    // 3. アクティブタブをダブルクリック
    // 4. WorkspaceRenameDialog が表示されることを確認
    // 5. キャンセルでダイアログを閉じる
    // 6. ワークスペースを削除（cleanup）
  }
);
```

`workspace-editing.spec.ts` の末尾に追加。`@smoke` タグ付き。

## 検証

- `pnpm biome check` でエラーなし
- svelte-check でエラーなし
