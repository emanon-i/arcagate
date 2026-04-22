---
id: PH-20260422-041
title: "編集モード状態視認性改善"
status: wip
priority: P1
batch: 8
created: 2026-04-22
---

## 背景・目的

2 件の UX 粗:

1. WorkspaceSidebar の確定/キャンセルボタンがアイコンのみ → 意図が伝わりにくい
2. WorkspaceLayout の空状態テキスト "ワークスペースがまだありません" は誤解を招く
   （ワークスペース自体は存在する。ウィジェットが 0 件という状態）

## 制約

- WorkspaceSidebar.svelte と WorkspaceLayout.svelte の最小変更
- 既存の幅 200px / アイコンサイズは維持

## 実装仕様

### WorkspaceSidebar.svelte: 確定/キャンセルに文字ラベル追加

```svelte
<!-- 確定ボタン -->
<button ...>
  <Check class="h-4 w-4" />
  <span class="text-xs">完了</span>
</button>
<!-- キャンセルボタン -->
<button ...>
  <X class="h-4 w-4" />
  <span class="text-xs">戻す</span>
</button>
```

### WorkspaceLayout.svelte: 空状態テキスト修正

```svelte
<!-- 変更前 -->
<p ...>ワークスペースがまだありません</p>
<!-- 変更後 -->
<p ...>ウィジェットがまだ追加されていません</p>
```

## 受け入れ条件

- 編集モード時、確定/キャンセルボタンに「完了」「戻す」テキストが表示されること
- ウィジェット 0 件の空状態に正確なメッセージが表示されること
