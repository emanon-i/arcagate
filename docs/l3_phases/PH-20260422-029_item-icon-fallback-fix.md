---
status: todo
phase_id: PH-20260422-029
title: ItemIcon fallbackIconMap の item_type 名修正 + LibrarySidebar を typeIconMap に統一
depends_on: []
scope_files:
  - src/lib/components/arcagate/common/ItemIcon.svelte
  - src/lib/components/arcagate/library/LibrarySidebar.svelte
parallel_safe: true
---

# PH-20260422-029: ItemIcon fallbackIconMap バグ修正

## 目的

PH-20260422-021 で導入した `fallbackIconMap` が、実際の item_type 名
（`exe`, `url`, `script`, `folder`, `command`）ではなく
誤った名前（`app`, `file`）を使用しているため、
`exe` および `script` タイプのアイテムで `Box` フォールバックになっている。

また `LibrarySidebar.svelte` が独自の `systemIconMap` を持ち、
`item-type.ts` の `typeIconMap` と乖離している（`exe`: AppWindow vs Gamepad2）。

## 現状

```typescript
// ItemIcon.svelte: 実際の item_type と一致しない NG
const fallbackIconMap: Record<string, Component> = {
    url: Globe,
    folder: Folder,
    file: FileText,   // NG: 実際の type は "script"
    app: AppWindow,   // NG: 実際の type は "exe"
    command: Terminal,
};

// LibrarySidebar.svelte: typeIconMap と乖離
const systemIconMap: Record<string, Component> = {
    exe: AppWindow,   // typeIconMap では Gamepad2
    url: Globe,
    folder: FolderOpen,
    script: TerminalSquare,
    command: Cpu,
};
```

## 設計判断

- `ItemIcon.svelte`: `fallbackIconMap` を `item-type.ts` の `typeIconMap` と同じキー・値に揃える
- `LibrarySidebar.svelte`: `systemIconMap` を廃止し、`typeIconMap` をそのまま import して使用
- `AppWindow` / `Gamepad2` の統一: `typeIconMap` に従い `exe: Gamepad2` に統一

## 実装ステップ

### Step 1: ItemIcon.svelte の fallbackIconMap 修正

```typescript
import { Cpu, FolderOpen, Gamepad2, Globe, TerminalSquare } from '@lucide/svelte';

const fallbackIconMap: Record<string, Component> = {
    exe: Gamepad2,
    url: Globe,
    script: TerminalSquare,
    folder: FolderOpen,
    command: Cpu,
};
```

不要な import（AppWindow, Box, FileText, Folder, Terminal）を削除。
`Box` は削除し、未定義 type の fallback は `Gamepad2`（exe と同じ）とする。

### Step 2: LibrarySidebar.svelte を typeIconMap に統一

```svelte
<script lang="ts">
import type { Component } from 'svelte';
import SidebarRow from '$lib/components/arcagate/common/SidebarRow.svelte';
import { typeIconMap } from '$lib/constants/item-type';
import { itemStore } from '$lib/state/items.svelte';
// ...
// systemIconMap を削除し typeIconMap を直接使用
</script>

<!-- 使用箇所 -->
<SidebarRow
    icon={typeIconMap[tag.name as keyof typeof typeIconMap] ?? LayoutDashboard}
    ...
/>
```

### Step 3: pnpm verify

## コミット規約

`fix(PH-20260422-029): ItemIcon fallbackIconMap の item_type 名修正 + LibrarySidebar typeIconMap 統一`

## 受け入れ条件

- [x] `pnpm verify` 通過
- [x] exe タイプのアイテムで icon_path なしの場合 Gamepad2 アイコンが表示されること
- [x] script タイプのアイテムで icon_path なしの場合 TerminalSquare アイコンが表示されること
- [x] LibrarySidebar の exe タグが AppWindow ではなく Gamepad2 アイコンで表示されること
