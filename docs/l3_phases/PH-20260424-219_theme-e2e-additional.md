---
id: PH-20260424-219
title: テーマ E2E 追加（保存永続化・JSON インポート完成）
status: todo
priority: medium
parallel_safe: false
scope_files:
  - tests/e2e/settings.spec.ts
depends_on: [PH-20260424-218]
---

## 目的

PH-216 で計画したがまだ未実装の E2E テストを追加する。

## テストケース

1. CSS 変数がリアルタイム反映されること（カラー変更 → DOM で確認）
2. 「保存」後に変数が DB に永続化されること（再ロード後に値が維持）
3. JSON インポートで新テーマが作成されること（インポート → テーマ一覧に表示）

## 受け入れ条件

- [ ] 上記 3 テストが pass
- [ ] `pnpm verify` 全通過
- [ ] @smoke テストが変更されていないこと（CI 影響なし）
