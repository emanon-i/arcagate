---
id: PH-20260424-229
title: theme-editor.spec.ts 新設（テーマエディタ専用 E2E）
status: done
priority: medium
parallel_safe: false
scope_files:
  - tests/e2e/theme-editor.spec.ts
  - tests/e2e/settings.spec.ts
depends_on: [PH-20260424-226, PH-20260424-227]
---

## 目的

settings.spec.ts に混在しているテーマエディタ関連テストを
`theme-editor.spec.ts` に分離・拡充する。

## テストケース（新規 or 移動）

1. 全変数カバレッジ確認: ThemeEditor 展開後に `--ag-radius-chip` など非色変数が表示される
2. 変数編集 → リアルタイム CSS 反映 → 保存 → リロード → 復元（round-trip）
3. ファイルダウンロードエクスポート（ダウンロード属性の a 要素確認）
4. ファイル選択インポート round-trip

## 受け入れ条件

- [ ] theme-editor.spec.ts が新設され独立して実行可能
- [ ] 上記テストが CI で通過
- [ ] `pnpm verify` 全通過
