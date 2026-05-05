---
id: PH-20260422-061
title: workspaceStore moveWidget / deleteWorkspace テスト追加
status: done
batch: 12
---

## 目的

moveWidget（衝突なし・衝突あり）・deleteWorkspace・IPC エラーの各ケースをテスト。

## 受け入れ条件

- `moveWidget()` 衝突なし → 指定 (x,y) に移動
- `moveWidget()` 衝突あり → findFreePosition で代替位置に移動
- `deleteWorkspace()` アクティブ削除 → activeWorkspaceId が null
- `loadWorkspaces()` エラー → error state 設定

## 検証

- pnpm verify 通過
- 衝突ありの期待値: othersWithout=[w1] なので findFreePosition → (1,0)
