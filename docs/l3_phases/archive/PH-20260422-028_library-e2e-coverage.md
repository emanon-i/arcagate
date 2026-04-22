---
status: done
phase_id: PH-20260422-028
title: Library E2E テストカバレッジ拡充（空状態・タグフィルタ・starred）
depends_on: []
scope_files:
  - tests/e2e/library.spec.ts
parallel_safe: true
---

# PH-20260422-028: Library E2E テストカバレッジ拡充

## 目的

Batch 4 で実装した Library の機能（sys:starred バッジ、空状態ガイド、タグフィルタ）に
対応する E2E テストが存在しない。実装はあるが防衛テストがない状態。

## 現状

```
tests/e2e/
  library.spec.ts         ← 既存（中身を調査して追加分を確認）
  workspace-editing.spec.ts
```

PH-20260422-018 で Workspace E2E を追加したが、Library のカバレッジは不足している。

## 実装ステップ

### Step 1: 既存 library.spec.ts の内容確認

`tests/e2e/library.spec.ts` を読んで現在のテスト一覧と構造を把握する。

### Step 2: 不足テストを追加

以下のテストを追加（既存テストとの重複を確認してから）:

**空状態ガイド（PH-20260422-023）**:

```typescript
test('アイテムが0件のときガイドと「アイテムを追加」ボタンが表示される', async ({ page }) => {
    // DB にアイテムがない状態を前提とする（新規セッション）
    // または: itemStore.items を全削除してからチェック
});
```

**検索0件メッセージ（PH-20260422-023）**:

```typescript
test('検索結果0件で「一致するアイテムはありません」が表示される', async ({ page }) => {
    // 検索バーに存在しない文字列を入力
    // "一致するアイテムはありません" テキストを確認
});
```

**starred バッジ（PH-20260422-019）**:

```typescript
test('DetailPanel で ★ ボタンを押すとカードに星バッジが表示される', async ({ page }) => {
    // アイテムを選択 → DetailPanel の ★ ボタンをクリック
    // LibraryCard に .rounded-full.bg-[var(--ag-accent)] が表示されることを確認
});
```

### Step 3: pnpm verify

## コミット規約

`test(PH-20260422-028): Library E2E テスト拡充（空状態・検索0件・starred バッジ）`

## 受け入れ条件

- [x] `pnpm verify` 通過（既存 E2E テスト含む）
- [x] 3本以上の新規 E2E テストが追加されていること
- [x] 新規テストがすべて GREEN であること

## 停止条件

- 既存 library.spec.ts のテストが全件 GREEN でない → まず既存の失敗を調査して報告
- starred バッジのテストで `data-testid` が存在しない → 先に LibraryCard に testid 追加が必要
