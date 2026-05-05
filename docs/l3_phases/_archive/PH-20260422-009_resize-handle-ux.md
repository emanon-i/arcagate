---
status: done
phase_id: PH-20260422-009
title: ウィジェット D&D リサイズハンドル可視性 + ドラッグフィードバック改善
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: true
---

# PH-20260422-009: ウィジェット D&D UX 改善

## 目的

dispatch-log B に記録した Workspace 編集 UX の粗を修正する。\
リサイズハンドルが 4×4px で発見しにくく、ドラッグ中の視覚フィードバックがないため
「編集しやすい」Workspace ビジョンから外れている。差分修正で 3 点を改善する。

## 参照ドキュメント

- `docs/desktop_ui_ux_agent_rules.md` §1 操作可能性、§2 視認性
- `docs/lessons.md`

## 改善内容

### 1. リサイズハンドル可視性改善

現状:

```svelte
<div class="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm bg-[var(--ag-accent)]/30 hover:bg-[var(--ag-accent)]/60">
```

修正案:

- サイズを `h-4 w-4` → `h-5 w-5` に拡大
- 常時表示の不透明度を `/30` → `/40` に上げ
- ホバー時: `/60` → `/80` + `shadow-sm` 追加
- グリップアイコン（`GripVertical` などの lucide アイコン）を内部に表示

```svelte
<div class="absolute bottom-1 right-1 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-sm bg-[var(--ag-accent)]/40 shadow-sm hover:bg-[var(--ag-accent)]/80">
  <GripVertical class="h-3 w-3 text-white/70" />
</div>
```

### 2. ドラッグ中のウィジェット opacity

現状: ドラッグ中に何も変わらない\
修正: `movingWidget === widget.id` のとき `opacity-60` を追加

```svelte
<div class:opacity-60={movingWidget === widget.id} ...>
```

### 3. 衝突時の視覚フィードバック（トースト）

現状: `workspaceStore.moveWidget` がウィジェットを findFreePosition() で無言移動\
確認のみ: 移動後に意図しない位置に飛ぶケースがあるかコードを確認し、問題なければスキップ\
問題あり: トーストで「別の空き位置に移動しました」を 2 秒表示

## コミット規約

`feat(PH-20260422-009): ウィジェットリサイズハンドル可視性 + ドラッグ opacity 改善`

## 受け入れ条件

- [x] リサイズハンドルが `h-5 w-5` + `GripVertical` アイコン + `shadow-sm` で視認性改善
- [x] ドラッグ中のウィジェットに `opacity-60 transition-opacity` が適用される
- [x] 衝突フィードバック確認: `findFreePosition()` 呼び出しは workspace service 側のみ、UI への通知なし → 小規模修正のため今回はスキップし dispatch-log にメモ
- [x] `pnpm verify` 通過（svelte-check 確認済み）

## Exit Criteria

受け入れ条件 3 つがすべて [x]

## 停止条件

- 衝突ハンドリングの修正が WorkspaceLayout 外の大規模変更を要する → スキップして記録
