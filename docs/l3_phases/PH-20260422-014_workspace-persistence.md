---
status: todo
phase_id: PH-20260422-014
title: アクティブワークスペース localStorage 永続化
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/state/workspace.svelte.ts
parallel_safe: true
---

# PH-20260422-014: アクティブワークスペース永続化

## 目的

現状、`workspaceStore.activeWorkspaceId` は起動のたびにリセットされ、\
常に最初のワークスペースが選択される。\
複数ワークスペースを使い分けるユーザが前回作業していたワークスペースに\
自動で戻れるよう、`localStorage` に選択状態を保存する。

## 設計判断

- キー: `'active-workspace'`（configStore の `'widget-zoom'` 命名規則に準拠）
- 復元時: localStorage の ID に対応するワークスペースが存在しない（削除済み等）場合は fallback として `workspaces[0]` を使う
- 保存タイミング: `setActiveWorkspace(id)` 呼び出し時（ユーザが明示的に切り替えた時のみ）
- 削除時の整合: `deleteWorkspace(id)` で削除されたワークスペースが activeId と一致したら localStorage から削除

## 実装ステップ

### Step 1: workspace.svelte.ts の setActiveWorkspace を修正

```typescript
const ACTIVE_WS_KEY = 'active-workspace';

// setActiveWorkspace: ID を localStorage にも保存
function setActiveWorkspace(id: string) {
    activeWorkspaceId = id;
    localStorage.setItem(ACTIVE_WS_KEY, id);
    // widgets の再読み込み（既存ロジック維持）
    ...
}
```

### Step 2: 初期化時に localStorage から復元

```typescript
// loadWorkspaces の最後に追加
const saved = localStorage.getItem(ACTIVE_WS_KEY);
if (saved && workspaces.find(w => w.id === saved)) {
    activeWorkspaceId = saved;
} else {
    activeWorkspaceId = workspaces[0]?.id ?? null;
}
```

### Step 3: deleteWorkspace で localStorage をクリア

```typescript
// deleteWorkspace 完了後
if (localStorage.getItem(ACTIVE_WS_KEY) === id) {
    localStorage.removeItem(ACTIVE_WS_KEY);
}
```

### Step 4: pnpm verify

## コミット規約

`feat(PH-20260422-014): アクティブワークスペース選択を localStorage に永続化`

## 受け入れ条件

- [ ] Workspace タブ A を選択 → アプリ再起動 → タブ A が選択された状態で起動する
- [ ] タブ A を選択後にそのワークスペースを削除 → 再起動時にデフォルト（最初のタブ）が選択される
- [ ] `pnpm verify` 通過

## 停止条件

- `loadWorkspaces` のタイミングが SSR と Tauri 初期化の境界で問題を起こす → 停止して報告
