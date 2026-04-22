---
id: PH-20260422-040
title: "ウィジェット削除確認ダイアログ"
status: done
priority: P0
batch: 8
created: 2026-04-22
---

## 背景・目的

ゴミ箱ボタンをクリックすると即座に削除される（undo なし）。
誤操作で配置が消えると DB 往復で再追加が必要になり、ユーザービリティを損なう。

## 制約

- WorkspaceLayout.svelte のみ変更
- 既存の renameOpen ダイアログと同パターン（固定モーダル）
- shadcn コンポーネント追加不要

## 実装仕様

### 状態追加

```ts
let deleteConfirmId = $state<string | null>(null);
```

### ゴミ箱ボタン変更

```svelte
onclick={() => (deleteConfirmId = widget.id)}
```

（即時 `removeWidget` から確認ステートセットへ変更）

### 確認ダイアログ追加

renameOpen ダイアログと同パターン:

```svelte
{#if deleteConfirmId}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
       role="dialog" aria-modal="true" tabindex="-1"
       onclick={(e) => { if (e.target === e.currentTarget) deleteConfirmId = null; }}
       onkeydown={(e) => { if (e.key === 'Escape') deleteConfirmId = null; }}>
    <div class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-6 shadow-[var(--ag-shadow-dialog)]">
      <h3>ウィジェットを削除しますか？</h3>
      <p>この操作は元に戻せません。</p>
      <div class="flex justify-end gap-2">
        <button onclick={() => deleteConfirmId = null}>キャンセル</button>
        <button onclick={() => { void workspaceStore.removeWidget(deleteConfirmId!); deleteConfirmId = null; }}>削除</button>
      </div>
    </div>
  </div>
{/if}
```

## 受け入れ条件

- ゴミ箱クリック → 確認ダイアログが表示されること
- 「削除」クリック → ウィジェット削除
- 「キャンセル」/ Escape → ダイアログを閉じ、削除しない
