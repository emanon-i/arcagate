---
status: done
phase_id: PH-20260423-190
title: WidgetSettingsDialog + AutostartToggle ボタン polish（整理）
category: 整理
scope_files:
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte
  - src/lib/components/settings/AutostartToggle.svelte
parallel_safe: true
depends_on: []
---

## 目的

WidgetSettingsDialog のキャンセル・保存ボタンと AutostartToggle の toggle ボタンに focus-visible + active:scale が未設定。設定パネル内のインタラクティブ要素の一貫性を確保する。

## 対象

### WidgetSettingsDialog.svelte

- 「キャンセル」「保存」ボタンに:

```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

### AutostartToggle.svelte

- トグルボタン（role="switch"）に focus-visible 追加:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

※ トグルスイッチは active:scale より `focus-visible` が重要。active:scale は省略可（トグル独特のインタラクションを尊重）。

## 検証

- `pnpm biome check` でエラーなし
- svelte-check でエラーなし
