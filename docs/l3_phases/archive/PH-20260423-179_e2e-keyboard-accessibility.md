---
status: wip
phase_id: PH-20260423-179
title: E2E キーボードアクセシビリティ防衛テスト
category: 防衛
scope_files:
  - tests/e2e/keyboard-accessibility.spec.ts
parallel_safe: true
depends_on:
  - PH-20260423-176
  - PH-20260423-178
---

## 目的

PH-176/178 で追加した focus-visible スタイルの退行防止テストを追加する。LibraryDetailPanel のパネル閉じるボタンが Tab キーで到達でき、Enter で閉じられることを確認する。

## 変更内容

新規ファイル `tests/e2e/keyboard-accessibility.spec.ts` を作成:

```
@smoke タグ付き:
- 「LibraryDetailPanel 閉じるボタンが Tab + Enter で閉じられること」
  1. 1280x800 にリサイズ
  2. アイテム作成 → カードクリック → DetailPanel 表示確認
  3. Tab を数回押してパネル閉じるボタン（aria-label="パネルを閉じる"）にフォーカス
  4. Enter を押してパネルが消えることを確認
```

## 検証

- `pnpm verify` グリーン（E2E はローカル実行不可のため CI で確認）
