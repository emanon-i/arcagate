---
id: PH-20260422-094
title: LibraryDetailPanel Enter キーで起動
status: done
batch: 20
priority: medium
created: 2026-04-22
parallel_safe: true
scope_files:
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
---

## 背景/目的

LibraryDetailPanel が開いた状態で Enter キーを押すと選択中アイテムが起動されると
ランチャーアプリとしての使い勝手が向上する。
現状はダブルクリックのみが起動手段で、キーボード操作が一切できない。

## 修正内容

`LibraryDetailPanel.svelte` に Enter キーハンドラを追加:

```svelte
<svelte:window
    onkeydown={(e) => {
        if (e.key === 'Enter' && item) {
            // フォーム内入力要素にフォーカスがある場合はパス
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            void launchItem(item.id).then(() =>
                toastStore.add(`${item.label} を起動しました`, 'success')
            );
        }
    }}
/>
```

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] DetailPanel 表示中に Enter キーでアイテムが起動されること
- [ ] タグドロップダウン内の input フォーカス中は Enter キーでは起動されないこと
