---
id: PH-20260422-092
title: Workspace 編集モード Esc キャンセル対応
status: wip
batch: 20
priority: high
created: 2026-04-22
parallel_safe: true
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
---

## 背景/目的

lessons.md に「パネル/モーダル: 閉じるボタン + Esc 対応を必ず付ける」とあるが、
Workspace の編集モードには `svelte:window` Esc ハンドラが未実装。
「完了」「戻す」ボタンのクリックのみが唯一の終了手段で、UX が劣る。

## 修正内容

`WorkspaceLayout.svelte` に `svelte:window onkeydown` を追加:

```svelte
<svelte:window
    onkeydown={(e) => {
        if (e.key === 'Escape' && editMode && !deleteConfirmId && !renameOpen) {
            cancelEdit();
        }
    }}
/>
```

**条件**:

- `editMode = true` のときのみ
- `deleteConfirmId != null` または `renameOpen = true` のときは各ダイアログが Esc を処理するため除外

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] 編集モード中に Esc を押すと `cancelEdit()` が呼ばれ編集モードが終了すること
- [ ] 削除確認ダイアログ表示中に Esc を押してもダイアログのみ閉じ、編集モードは継続すること
