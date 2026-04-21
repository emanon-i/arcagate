---
status: done
phase_id: PH-20260422-016
title: WidgetShell レスポンシブ高さ修正（h-full + overflow-y-auto）
depends_on:
  - PH-20260422-015
scope_files:
  - src/lib/components/arcagate/common/WidgetShell.svelte
parallel_safe: true
---

# PH-20260422-016: WidgetShell レスポンシブ高さ修正

## 目的

リサイズしたウィジェットの内容が正しく表示されない問題を修正する。

**根本原因**: `WidgetShell` の root div が `h-full` を持たない。グリッドセルが 2 行 span になっても WidgetShell は自然なコンテンツ高さのままで余白が生じる。反対に height=1 でコンテンツが多い場合、WidgetShell がグリッドセルをはみ出して他ウィジェットに重なる。

## 設計判断

- WidgetShell root を `h-full flex flex-col` にし、グリッドセル全体を占有させる
- ヘッダー部（アイコン + タイトル + メニューボタン）は `shrink-0`（固定高さ）
- `{@render children()}` を `flex-1 min-h-0 overflow-y-auto` で囲む
  - `flex-1`: 残余スペースを全て使う
  - `min-h-0`: flexbox の高さ折り畳み問題を回避（`flex-1` だけでは親の overflow が効かない）
  - `overflow-y-auto`: コンテンツが多い場合にスクロールバーを表示

## 実装ステップ

### Step 1: WidgetShell.svelte の root div を修正

現状:

```svelte
<div class="rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
```

変更後:

```svelte
<div class="flex h-full flex-col rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
```

### Step 2: ヘッダーに shrink-0、コンテンツに flex-1 + overflow

```svelte
<!-- ヘッダー: 高さ固定 -->
<div class="mb-3 shrink-0 flex items-center justify-between">
    ...
</div>

<!-- コンテンツ: 残余スペース + スクロール -->
<div class="flex-1 min-h-0 overflow-y-auto">
    {@render children()}
</div>
```

### Step 3: pnpm verify

## コミット規約

`fix(PH-20260422-016): WidgetShell h-full + overflow-y-auto でリサイズ時の可読性修正`

## 受け入れ条件

- [x] ウィジェットを height=2 に拡大すると、コンテンツが縦に伸びてアイテムがより多く表示される
- [x] ウィジェットを height=1 に縮小すると、コンテンツエリアにスクロールバーが現れる（はみ出しなし）
- [x] 通常表示（編集モードなし）でウィジェットが正しいグリッドセルサイズに収まる
- [x] `pnpm verify` 通過

## 停止条件

- `overflow-y-auto` + `flex-1 min-h-0` でも WidgetShell が親グリッドセルをはみ出す → 停止して代替案を検討
