---
status: done
phase_id: PH-20260423-181
title: MoreMenu + WorkspaceRenameDialog submit ボタン focus-visible / active:scale 追加
category: 改善
scope_files:
  - src/lib/components/arcagate/common/MoreMenu.svelte
  - src/lib/components/arcagate/workspace/WorkspaceRenameDialog.svelte
parallel_safe: true
depends_on: []
---

## 目的

MoreMenu トリガーと WorkspaceRenameDialog の submit ボタンに focus-visible リングと active:scale を追加する。

## 変更内容

### MoreMenu.svelte

DropdownMenu.Trigger のクラスに追加:

```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

### WorkspaceRenameDialog.svelte（submit ボタン）

type="submit" ボタンのクラスに追加:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
```

(active:scale は既存の `active:scale-[0.97]` で OK)

## 検証

- `pnpm verify` グリーン
