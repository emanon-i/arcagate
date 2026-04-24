---
id: PH-20260424-216
title: テーマエディタ E2E テスト
status: in_progress
priority: medium
parallel_safe: false
scope_files:
  - tests/e2e/settings.spec.ts
depends_on: [PH-20260424-213, PH-20260424-214]
---

## 目的

テーマエディタ・インポート/エクスポートの品質を E2E テストで担保する。

## テストケース

1. 「現在のテーマを複製」でカスタムテーマが作成されること（@smoke）
2. カスタムテーマの編集で CSS 変数がリアルタイム反映されること
3. 「保存」後に変数が DB に永続化されること（再ロード確認）
4. 「削除」でカスタムテーマが一覧から消えること
5. JSON エクスポートでクリップボードに JSON が入ること
6. JSON インポートで新テーマが作成されること

## 受け入れ条件

- [ ] 上記テストが pass
- [ ] @smoke タグ付きテストが PR CI で通過する
- [ ] `pnpm verify` 全通過
