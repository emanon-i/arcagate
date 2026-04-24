---
id: PH-20260424-235
title: Library/Workspace の launchItem エラーハンドリング統一
status: done
priority: medium
parallel_safe: false
scope_files:
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
  - src/lib/components/arcagate/workspace/FavoritesWidget.svelte
  - src/lib/components/arcagate/workspace/ProjectsWidget.svelte
  - src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte
depends_on: []
---

## 目的

`palette.svelte.ts` の `launch()` はエラーハンドリングあり（catch + toastStore.add error）だが、
Library / Workspace 各コンポーネントの `launchItem()` 直接呼び出しはエラーを無視している。
ファイルが見つからない・パスが無効な場合にユーザーへのフィードバックがない。

## 実装内容

各コンポーネントの `void launchItem(id)` または `.then(success)` に
`.catch((e) => toastStore.add(..., 'error'))` を追加:

1. `LibraryDetailPanel.svelte` の `handleLaunch()` → success/error toast 両方
2. `LibraryDetailPanel.svelte` の Enter キーハンドラ → catch 追加
3. `LibraryMainArea.svelte` の ondblclick (2箇所) → success/error toast
4. `FavoritesWidget.svelte` の onclick → success/error toast
5. `ProjectsWidget.svelte` の onclick → success/error toast
6. `RecentLaunchesWidget.svelte` の onclick → success/error toast

## 受け入れ条件

- [ ] 全 launchItem 呼び出しがエラーを toast で表示する
- [ ] 成功時 toast は既存動作を維持（一部コンポーネントには未実装だったため追加）
- [ ] `pnpm verify` 全通過
