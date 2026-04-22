---
id: PH-20260423-139
title: waitForLibraryReady ヘルパー追加（reload 後の安定待機）
status: todo
priority: high
type: test-infra
parallel_safe: true
depends_on: []
---

# PH-20260423-139: waitForLibraryReady ヘルパー追加

## 背景・目的

`page.reload()` + `waitForAppReady()` の後、Library のデータロード（IPC `cmd_list_items`）
が完了するまでに時間がかかる。現在は各テストが個別に `waitForSelector` や
`toBeVisible({ timeout: 30_000 })` を使って対処しているが、共通 helper にまとめる。

lessons.md の「E2E: `library-card-{id}` の表示確認テストはフレーキー（Batch 21 の観測）」の
「根本改善候補: `waitForAppReady` に Library カードが1件以上表示されるまで待つ条件を追加」に対応。

## スコープファイル

- `tests/helpers/app-ready.ts`

## 実装内容

```typescript
/**
 * Library の初期データロード完了を待機する。
 * - アイテムが1件以上ある場合: 最初のカードが表示されるまで待つ
 * - アイテムが0件の場合: 空状態メッセージが表示されるまで待つ
 */
export async function waitForLibraryReady(page: Page, timeout = 20_000): Promise<void> {
    await page.waitForFunction(
        () => {
            const hasCards = document.querySelector('[data-testid^="library-card-"]') !== null;
            const hasEmpty =
                document.querySelector('[data-testid="library-empty"]') !== null ||
                document.querySelector('[data-testid="library-main-wrapper"]') !== null;
            return hasCards || hasEmpty;
        },
        { timeout },
    );
}
```

## 受け入れ条件

- [ ] `tests/helpers/app-ready.ts` に `waitForLibraryReady` が追加されている
- [ ] JSDoc コメントあり
- [ ] `pnpm exec biome check tests/helpers/app-ready.ts` がエラーなし
