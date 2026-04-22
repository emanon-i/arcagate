---
id: PH-20260422-103
title: HotkeyInput UX 磨き込み（日本語化 + ag トークン置換）
status: todo
batch: 23
priority: medium
created: 2026-04-22
scope_files:
  - src/lib/components/settings/HotkeyInput.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

`HotkeyInput.svelte` に以下の粗が残っている:

1. ボタンラベルが "Record" のまま（英語）
2. `border-primary ring-primary` / `bg-secondary text-secondary-foreground` など
   shadcn トークンを直接参照しており、AG テーマ変更時に色が追従しない
3. `<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->` が
   `<input readonly>` に付いているが、readonly input は実際にはインタラクティブ扱い可能なため
   適切な対処（tabindex 付与など）も検討する

## 実装内容

### 1. ボタンラベル日本語化

```svelte
{recording ? "キャンセル" : "変更"}
```

（現在: `{recording ? "キャンセル" : "Record"}` → "Record" を "変更" に）

### 2. shadcn トークン → ag-* トークン置換

| 変更前                                                         | 変更後                                                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `border-primary ring-1 ring-primary`                           | `border-[var(--ag-accent)] ring-1 ring-[var(--ag-accent)]`                              |
| `bg-secondary text-secondary-foreground hover:bg-secondary/80` | `bg-[var(--ag-surface-3)] text-[var(--ag-text-primary)] hover:bg-[var(--ag-surface-4)]` |
| `border-destructive bg-destructive/10 text-destructive`        | そのまま（ag-* に danger 相当トークンなし）                                             |

### 3. a11y 対応

`<input readonly>` に `tabindex="0"` を付与して、svelte-ignore なしで a11y 警告を解消する。

## 受け入れ条件

- [ ] ボタンラベルが "変更" / "キャンセル" になっていること
- [ ] `pnpm check` で 0 WARNINGS（svelte-ignore コメントが除去されていること）
- [ ] テーマ（ライト/ダーク）切替時に recording リングが ag-accent 色になること（目視確認）
- [ ] `pnpm verify` 全通過
