---
id: PH-20260423-120
title: LibraryDetailPanel タグドロップダウン閉後フォーカス返却
status: todo
batch: 26
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

`LibraryDetailPanel` のタグ追加ドロップダウンは、閉じた後に
フォーカスが元のトリガーボタンに返却されない。
キーボードユーザーがドロップダウンを閉じると操作位置を見失う。

## 実装内容

1. タグドロップダウントリガーボタンへの `bind:this={tagTriggerEl}` 追加
2. ドロップダウンが閉じるタイミング（`tagDropdownOpen = false` 後）に
   `tagTriggerEl?.focus()` を呼び出す
3. 具体的には `closeTagDropdown()` または `onClickOutside` ハンドラ内で実装

```svelte
let tagTriggerEl: HTMLButtonElement | undefined;

function closeTagDropdown() {
  tagDropdownOpen = false;
  tagTriggerEl?.focus();
}
```

## 注意事項

- Escape キーでドロップダウンを閉じた場合も同様にフォーカスを返すこと
- タグを選択して閉じた場合もフォーカスを返すこと
- svelte-check 0 errors を維持すること

## 受け入れ条件

- [ ] ドロップダウン閉後、トリガーボタンにフォーカスが返ること（手動確認）
- [ ] Escape で閉じた場合も同様
- [ ] タグ選択で閉じた場合も同様
- [ ] svelte-check 0 errors
