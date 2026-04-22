---
id: PH-20260423-114
title: WidgetSettingsDialog に Escape/backdrop-click クローズを追加
status: todo
batch: 25
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

`WidgetSettingsDialog` はキャンセルボタンか保存ボタンでしか閉じられない。
`WorkspaceLayout` の削除確認ダイアログや名前変更ダイアログは Escape キーと backdrop click の両方で閉じられる。
統一のため `WidgetSettingsDialog` にも同様の動作を追加する。

## 実装内容

### backdrop click でクローズ

```svelte
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  role="dialog"
  aria-modal="true"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  tabindex="-1"
>
```

### svelte-ignore

`onclick` + `onkeydown` を非インタラクティブ `<div>` に追加する場合は svelte-ignore が必要:

```svelte
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
```

ただし `role="dialog"` は `alertdialog` 等と同様にインタラクティブな役割を持つため、
svelte-check が何を警告するか確認してから適切な ignore を選ぶこと。

## 受け入れ条件

- [ ] Escape キーでダイアログが閉じること
- [ ] backdrop（オーバーレイ）をクリックするとダイアログが閉じること
- [ ] ダイアログ内のボタンをクリックしても閉じないこと（`e.target === e.currentTarget` チェック）
- [ ] svelte-check 0 errors / 0 warnings
