---
status: done
phase_id: PH-20260422-012
title: 未使用 @formkit/drag-and-drop 削除 + stale TODO 整理
depends_on:
  - PH-20260422-001
scope_files:
  - package.json
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: true
---

# PH-20260422-012: 未使用依存 + stale TODO 整理

## 目的

dispatch-log B に記録した通り、`@formkit/drag-and-drop` が `package.json` に存在するが\
Workspace の D&D は HTML5 Drag API の手動実装に切り替わっており完全に未使用。\
コードベースに stale な TODO コメントや不要な依存が残ることは\
将来の参入障壁になるため、クリーンアップする。

## 実装ステップ

### Step 1: 未使用依存の確認・削除

1. `grep -r "formkit" src/` で使用箇所がないことを確認
2. `pnpm remove @formkit/drag-and-drop`
3. `pnpm verify` を実行してビルドが通ることを確認

### Step 2: stale TODO / FIXME コメントの確認

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" src/ src-tauri/src/
```

各 TODO について:

- 既に解決済み → 削除
- 別 Plan のスコープ → dispatch-log にメモして残す
- このフェーズで解決可能な小粒 → 同コミットで修正

### Step 3: WorkspaceLayout.svelte の svelte-ignore コメント確認

`WorkspaceLayout.svelte` に `<!-- svelte-ignore a11y_no_static_element_interactions -->` が\
2 箇所ある。これらが本当に必要か確認:

- 必要（`ondragover` を div に付与する設計上やむを得ない）→ コメント + `data-testid` で意図を明示
- 不要（イベントハンドラを削除できる）→ 削除

### Step 4: pnpm verify 通過確認

## コミット規約

`chore(PH-20260422-012): 未使用 @formkit/drag-and-drop 削除 + stale TODO 整理`

## 受け入れ条件

- [x] `@formkit/drag-and-drop` が package.json から削除されている
- [x] `grep -r "formkit" src/` が 0 件（使用箇所なし確認済み）
- [x] stale TODO / FIXME がゼロ件（grep で確認済み）
- [x] `pnpm verify` 通過（biome/dprint/svelte-check 確認済み）

## Exit Criteria

受け入れ条件 4 つがすべて [x]

## 停止条件

- `@formkit/drag-and-drop` が実際にどこかで使われていることが判明 → 削除せず停止して報告
