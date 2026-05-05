---
id: PH-20260423-119
title: WidgetSettingsDialog を form 要素に置き換えて Enter キー送信を追加
status: todo
batch: 26
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

`WidgetSettingsDialog` は現在 `<div>` + `<button>` で構成されており、
フォーム入力中に Enter キーを押しても保存されない。
LibraryItemForm など他コンポーネントと一貫した UX にするため
`<form>` 要素でラップして Enter 送信を有効にする。

## 実装内容

1. `<form onsubmit={handleSave}>` でフォーム内容をラップ
2. 保存ボタンを `type="submit"` に変更
3. キャンセルボタンは `type="button"` のまま
4. `handleSave(e)` は `e.preventDefault()` を呼んで IPC 送信

```svelte
<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
  <!-- フィールド群 -->
  <button type="button" onclick={onClose}>キャンセル</button>
  <button type="submit">保存</button>
</form>
```

## 注意事項

- ダイアログの `onkeydown` Escape 処理（PH-114 で追加済み）と競合しないこと
- `svelte-check 0 errors` を維持すること

## 受け入れ条件

- [ ] フォーム内で Enter キーを押すと保存されること
- [ ] Escape でダイアログが閉じること（PH-114 の動作を維持）
- [ ] backdrop クリックでダイアログが閉じること（PH-114 の動作を維持）
- [ ] svelte-check 0 errors
