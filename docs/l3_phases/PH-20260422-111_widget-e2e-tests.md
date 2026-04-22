---
id: PH-20260422-111
title: Workspace ウィジェット E2E テスト追加（Favorites / Recent 空状態・表示）
status: done
batch: 24
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/widget-display.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

FavoritesWidget・RecentLaunchesWidget の表示テストが E2E で網羅されていない。
`workspace.spec.ts` はウィジェット追加のテストを持つが、ウィジェットの内容表示は未検証。

## 実装内容

`tests/e2e/widget-display.spec.ts` を新規作成する。

### テストケース

1. **Favorites 空状態** (@smoke): ★アイテムが0件の状態で FavoritesWidget が「★ のついたアイテムがここに表示されます」を表示すること
2. **Favorites アイテム表示**: starred アイテムを IPC で作成・スター付与後、FavoritesWidget にアイテム名が表示されること
3. **Recent 空状態**: RecentLaunchesWidget が「最近の起動履歴がここに表示されます」を表示すること

### 前提

- Workspace タブに切り替えてウィジェットが存在する状態にすること
- ウィジェット追加は IPC（`workspace_add_widget`）で行う
- テスト後はウィジェット・アイテムを IPC で削除してクリーンアップ

## 注意事項

- `workspace.spec.ts` の既存テストパターンを参考にする
- `waitForAppReady` と `page.waitForSelector` で非同期表示を待つ
- Favorites のアイテム表示テストは `itemStore.updateItem` (タグ付与) が FavoritesWidget に反映される
  ことを確認するため、PH-108 完了後に初めて安定する可能性がある

## 受け入れ条件

- [ ] `tests/e2e/widget-display.spec.ts` が新規作成されていること
- [ ] 3 テストが全通過すること（ローカル `pnpm test:e2e` または CI）
- [ ] @smoke タグが Favorites 空状態テストに付与されていること
