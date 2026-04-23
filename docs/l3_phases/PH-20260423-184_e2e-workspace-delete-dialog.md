---
status: done
phase_id: PH-20260423-184
title: E2E workspace 削除ダイアログ防衛テスト
category: 防衛
scope_files:
  - tests/e2e/workspace-editing.spec.ts
parallel_safe: true
depends_on: []
---

## 目的

WorkspaceDeleteConfirmDialog のキャンセル・確定フローの退行防止テストを追加する。PH-178 で cancel ボタンに active:scale を追加したので、ダイアログが正常に開閉できることを E2E で検証する。

## 変更内容

`tests/e2e/workspace-editing.spec.ts` に新規テスト追加:

```
「WorkspaceDeleteConfirmDialog でキャンセルするとダイアログが閉じること」
1. workspace を IPC で作成
2. workspace-editing の削除フロー（MoreMenu → 削除 → ダイアログ表示確認）
3. キャンセルボタンをクリックしてダイアログが消えること
4. workspace IPC で削除（クリーンアップ）
```

※ MoreMenu はウィジェット削除ダイアログ経由のみ。workspace 自体の削除は PageTabBar / workspace store から行う。

## 検証

- `pnpm verify` グリーン（テストは CI で確認）
