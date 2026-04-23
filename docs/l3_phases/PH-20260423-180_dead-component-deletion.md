---
status: wip
phase_id: PH-20260423-180
title: Dead コンポーネント4件削除（整理）
category: 整理
scope_files:
  - src/lib/components/arcagate/common/AppHeader.svelte
  - src/lib/components/arcagate/library/QuickRegisterDropZone.svelte
  - src/lib/components/arcagate/library/SensitiveControl.svelte
  - src/lib/components/palette/SearchInput.svelte
parallel_safe: true
depends_on: []
---

## 目的

`src/` 内のどのファイルからも import されていない dead コンポーネント4件を削除してコードベースをクリーンに保つ。

## 削除対象

- `src/lib/components/arcagate/common/AppHeader.svelte`
- `src/lib/components/arcagate/library/QuickRegisterDropZone.svelte`
- `src/lib/components/arcagate/library/SensitiveControl.svelte`
- `src/lib/components/palette/SearchInput.svelte`

削除前に再度 import 確認を行い、使用箇所がゼロであることを検証する。

## 検証

- `pnpm verify` グリーン（biome/svelte-check で参照切れエラーが出ないこと）
