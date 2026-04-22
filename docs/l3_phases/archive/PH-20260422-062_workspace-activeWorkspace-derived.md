---
id: PH-20260422-062
title: workspaceStore activeWorkspace $derived getter 追加
status: done
batch: 12
---

## 目的

`workspace.svelte.ts` に `$derived` による `activeWorkspace` getter を追加し、export オブジェクトに公開する。

## 変更

- `const activeWorkspace = $derived(workspaces.find((w) => w.id === activeWorkspaceId) ?? null)`
- export object に `get activeWorkspace()` を追加

## 受け入れ条件

- `activeWorkspaceId` と対応する workspace が返る
- workspaces 空のとき null を返す
- biome: `let` → `const` に修正済み

## 検証

- pnpm verify 通過
