---
id: PH-20260424-237
title: E2E 追加（ローカルアイテム起動失敗 toast + ItemForm トグル確認）
status: done
priority: medium
parallel_safe: false
scope_files:
  - tests/e2e/library-detail.spec.ts
  - tests/e2e/items.spec.ts
depends_on: []
---

## 目的

batch-55 で追加した launchItem エラーハンドリングを E2E で検証する。
また ItemForm の local/URL トグル切り替えが正しく動くことを確認する。

## テストケース

1. **library-detail.spec.ts**: 存在しないパスの exe アイテムを起動 → エラートースト確認
   - `item_type: 'exe'`, `target: 'C:\\NONEXISTENT_ARCAGATE_E2E_TEST\\app.exe'` で IPC 作成
   - Library カードをダブルクリック → `toast-error` が表示されること

2. **items.spec.ts**: ItemForm ローカル/URL トグルで入力フィールドが切り替わること
   - `add-item-button` クリック → デフォルトは「ローカル」モード
   - ファイル / フォルダのパス ラベルが表示される
   - 「URL」ボタンをクリック → URL 入力フィールドに切り替わる
   - 「ローカル」ボタンをクリック → ファイルパス入力に戻る

## 受け入れ条件

- [x] 存在しないパスのアイテム起動時にエラートーストが表示されること
- [x] ItemForm の local/URL トグルが正しく切り替わること
- [x] `pnpm verify` 全通過
