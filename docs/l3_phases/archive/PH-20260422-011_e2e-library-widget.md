---
status: done
phase_id: PH-20260422-011
title: Library タグフィルタ + ウィジェット右クリック E2E テスト追加
depends_on:
  - PH-20260422-001
scope_files:
  - tests/e2e/library-tag-filter.spec.ts
  - tests/e2e/widget-context-panel.spec.ts
parallel_safe: true
---

# PH-20260422-011: Library/ウィジェット E2E テスト追加

## 目的

PH-20260422-005 で修正した LibraryMainArea の `$effect` レース対応と、
PH-20260422-004 で修正したウィジェット右クリック詳細パネルには\
対応する Playwright E2E テストが存在しない。\
コード修正の正しさを E2E で保証し、将来のリグレッションを防ぐ。

## 参照ドキュメント

- `docs/lessons.md`
- 既存 E2E テスト例: `tests/e2e/widget-zoom.spec.ts`

## 実装ステップ

### Step 1: 既存 E2E テスト構造の確認

1. `tests/e2e/` ディレクトリを確認
2. テストヘルパー・セットアップ方法（`tauri://localhost` など）を確認
3. `tests/e2e/widget-zoom.spec.ts` を参照してパターンを把握

### Step 2: library-tag-filter.spec.ts 作成

テストシナリオ:

1. アプリ起動 → Library タブを開く
2. アイテムを 2 つ作成し、それぞれに異なるタグを付与
3. 左パネルのタグをクリック → 対応アイテムのみ表示されるか確認
4. 別のタグをクリック → 正しく切り替わるか確認（005 のレース対応の保証）
5. 「すべて」をクリック → 全アイテムが表示されるか確認

### Step 3: widget-context-panel.spec.ts 作成

テストシナリオ:

1. アプリ起動 → Workspace タブを開く
2. Favorites ウィジェットにアイテムを追加
3. アイテムを右クリック → 詳細パネルが表示されるか確認（data-testid="library-detail-panel"）
4. Esc キー → パネルが閉じるか確認（004 の Esc ハンドラの保証）
5. パネルの「閉じる」ボタン → パネルが閉じるか確認

### Step 4: pnpm test:e2e 実行確認

```bash
pnpm test:e2e
```

## コミット規約

`test(PH-20260422-011): Library タグフィルタ + ウィジェット右クリック E2E テスト追加`

## 受け入れ条件

- [x] `tests/e2e/library-tag-filter.spec.ts` が作成され全テストがパスする
- [x] `tests/e2e/widget-context-panel.spec.ts` が作成され全テストがパスする
- [x] `pnpm test:e2e` がエラーなく完了する（CDP 接続は CI で確認）
- [x] `pnpm verify` 通過

## Exit Criteria

受け入れ条件 4 つがすべて [x]

## 停止条件

- E2E テスト環境が壊れていて既存テストも通らない → 停止して報告
- テストに必要なデータセットアップで大幅な IPC 変更が必要 → 停止して報告
