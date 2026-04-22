---
id: PH-20260423-115
title: LibraryDetailPanel Enter キー起動の E2E テスト追加
status: todo
batch: 25
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/library-detail.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`LibraryDetailPanel.svelte` には `svelte:window onkeydown` で Enter キー起動が実装済み
（`e.key === 'Enter' && selectedItem` / INPUT フォーカス時は無効）。
dispatch-log の「手動確認依頼」に「Enter キーでアイテムが起動しトーストが出る」が「未確認」として残っている。
E2E テストで自動検証に昇格させる。

## 実装内容

`tests/e2e/library-detail.spec.ts` に以下テストを追加する。

### テストケース

1. **Enter キー起動（DetailPanel フォーカス時）**: アイテムを DetailPanel で表示し、
   Enter キーを押すとトーストが表示されること
2. **INPUT フォーカス時は Enter で起動しないこと**: DetailPanel 内の INPUT にフォーカスした状態で
   Enter を押してもトーストが表示されないこと（INPUT にフォーカスがある場合のガード確認）

### 実装上の注意

- LibraryDetailPanel は `detailPanel.getByTestId('library-detail-panel')` でスコープを絞る
- トーストは `page.getByText('を起動しました')` で確認
- タイムアウト: E2E での `launchItem` は実際のファイル起動は行われないが、
  Tauri の IPC 呼び出しは成功するためトーストは表示される
- `resizeWindow(page, 1280, 800)` で DetailPanel が表示される幅にする

## 受け入れ条件

- [ ] Enter キー起動テストが追加されていること
- [ ] INPUT フォーカス時のガードテストが追加されていること
- [ ] 全テストが通過すること（ローカルまたは CI）
