---
status: done
phase_id: PH-20260423-187
title: Setup ステップ + ExportImport ボタン focus-visible / active:scale 追加
category: 改善
scope_files:
  - src/lib/components/setup/StepAutostart.svelte
  - src/lib/components/setup/StepHotkey.svelte
  - src/lib/components/settings/ExportImport.svelte
parallel_safe: true
depends_on: []
---

## 目的

セットアップ画面（StepAutostart・StepHotkey）とデータ設定の ExportImport に focus-visible + active:scale が未設定。

## 対象ボタン

### StepAutostart.svelte

「次へ」ボタン（2 箇所）に追加:

```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

### StepHotkey.svelte

「次へ」ボタンに追加（同上）。

### ExportImport.svelte

「エクスポート」「インポート」ボタンに追加（同上）。

## 検証

- `pnpm biome check` でエラーなし
- svelte-check でエラーなし
