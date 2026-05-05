---
status: done
phase_id: PH-20260423-182
title: SettingsPanel テーマボタン + Tip 閉じるボタン focus-visible / active:scale 追加
category: 改善
scope_files:
  - src/lib/components/settings/SettingsPanel.svelte
  - src/lib/components/arcagate/common/Tip.svelte
parallel_safe: true
depends_on: []
---

## 目的

SettingsPanel のテーマ選択ボタン2件と Tip 閉じるボタンに focus-visible / active:scale を追加する。

## 変更内容

### SettingsPanel.svelte（ダーク/ライトボタン 2件）

追加クラス:

```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

transition も `transition-colors` → `transition-[color,background-color,border-color,transform]` に変更。

### Tip.svelte（閉じるボタン）

追加クラス:

```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

## 検証

- `pnpm verify` グリーン
