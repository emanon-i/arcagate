---
id: PH-20260422-043
title: "shadcn ↔ ag-* bridge CSS 整理"
status: done
priority: P2
batch: 8
created: 2026-04-22
---

## 背景・目的

`app.css` に shadcn 由来の oklch ベーストークン（`--background`, `--foreground`, `--border` 等）が
ハードコードされており、`arcagate-theme.css` の `--ag-*` トークンと独立している。
ダーク/ライトモード切り替え時に両システムが別々に動き、視覚的不整合が生じる可能性がある。

重複する意味的トークンを ag-* に統一し、app.css のハードコード値を排除する。

## 制約

- `src/app.css` のみ変更
- shadcn コンポーネント（`src/lib/components/ui/`）のビジュアルを壊さない
- oklch 構文から CSS 変数参照へ

## 実装仕様

以下のトークンを `ag-*` 参照に置き換え（`:root` と `.dark` 両方）:

| shadcn トークン      | 置き換え後               |
| -------------------- | ------------------------ |
| `--background`       | `var(--ag-surface-page)` |
| `--foreground`       | `var(--ag-text-primary)` |
| `--border`           | `var(--ag-border)`       |
| `--input`            | `var(--ag-border)`       |
| `--ring`             | `var(--ag-border-hover)` |
| `--muted`            | `var(--ag-surface-2)`    |
| `--muted-foreground` | `var(--ag-text-muted)`   |

card/popover/sidebar 等、AG コンポーネントで使用しないトークンはそのまま維持。

## 受け入れ条件

- `:root` と `.dark` 両方で対象トークンが ag-* 参照になること
- `pnpm verify` が通ること（ビジュアル破損なし）
