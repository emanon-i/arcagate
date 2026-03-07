---
status: done
phase_id: PH-003-G
depends_on:
  - PH-003-F
---

# PH-003-G: shadcn-svelte `import type` バグ修正

## 背景

shadcn-svelte CLI が生成した `src/lib/components/ui/` の 23 ファイルで `import type { X } from "bits-ui"` としているが、テンプレート内で `<X.Root>` 等のランタイム値として使用している。TypeScript の `import type` はコンパイル時に除去されるため:

- `svelte-check` が 39 エラーを報告
- DropdownMenu 系が実行時クラッシュ（MoreMenu は bits-ui 直接インポートで回避していた）

## 変更内容

### 1. ui/ 23 ファイルの `import type` → `import` 一括修正

`import type { X as XPrimitive } from "bits-ui"` → `import { X as XPrimitive } from "bits-ui"` に置換。

| グループ     | ファイル数 |
| ------------ | ---------- |
| DropdownMenu | 15         |
| Tooltip      | 5          |
| ScrollArea   | 2          |
| Separator    | 1          |

追加修正（ローカル `.svelte` の type import）:

- `dropdown-menu-content.svelte` — `import type DropdownMenuPortal` → `import DropdownMenuPortal`
- `tooltip-content.svelte` — `import type TooltipPortal` → `import TooltipPortal`

変更しなかったもの: `import type { ComponentProps } from "svelte"` 等の真の型インポート。

### 2. MoreMenu を shadcn ラッパー経由に統一

bits-ui 直接インポート → shadcn DropdownMenu ラッパー経由に変更。WidgetShell と同じパターン。

- `import { DropdownMenu } from 'bits-ui'` → `import * as DropdownMenu from '$lib/components/ui/dropdown-menu'`
- `onSelect` → `onclick`（shadcn API）
- Content/Item のカスタム class を削除し、shadcn デフォルトに統一
- Trigger のカスタム class（`--ag-*`）は Arcagate デザインの一部として維持

### 3. CLAUDE.md ルール更新

「やってはいけないこと」セクションの ui/ 手動編集ルールに、ビルドエラー・型エラー修正の例外を追記。

### 4. docs/lessons.md 記録

shadcn-svelte CLI の `import type` バグのパターン・修正方法・再発防止を追記。

## CLAUDE.md への例外ルール追加理由

`src/lib/components/ui/` は shadcn-svelte の scaffold 出力であり原則手動編集禁止だが、上流の CLI バグによるビルドエラー・型エラーはプロジェクトのビルドを阻害する。このような修正は例外として許可し、L3 ドキュメントに記録することとした。
