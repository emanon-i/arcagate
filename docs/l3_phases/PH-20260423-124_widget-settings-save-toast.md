---
id: PH-20260423-124
title: WidgetSettingsDialog 保存成功時にトースト通知を追加
status: todo
batch: 27
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

`WidgetSettingsDialog` で保存ボタンを押しても UI 上の変化がなく、
保存成功したか失敗したかユーザーがわからない。
他のダイアログ（アイテム起動など）が `toastStore` を使っているのに合わせて統一する。

## 実装内容

```svelte
import { toastStore } from '$lib/state/toast.svelte';

async function handleSave() {
  const newConfig: WidgetConfig = { ... };
  await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(newConfig));
  toastStore.add('設定を保存しました', 'success');
  onClose();
}
```

エラー時は `catch` で `toastStore.add('保存に失敗しました', 'error')` を表示する。

## 受け入れ条件

- [ ] 保存成功時に「設定を保存しました」トーストが表示されること
- [ ] エラー発生時に「保存に失敗しました」トーストが表示されること
- [ ] svelte-check 0 errors
