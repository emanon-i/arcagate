---
paths:
  - "src/**/*.{svelte,ts,css}"
---

# Frontend (SvelteKit) rules

`src/` のファイルを触る時にロードされる。state / IPC wrapper / component 構成は [foundation.md](../../docs/l2_foundation/foundation.md) を読む。

## 禁止

- 生の色値 (`#ffe600` / `rgb()` / `rgba()` / `hsl()` / `oklch()` / `bg-yellow-500` 等) を書かない。
  色は `var(--ag-*)` / `var(--c-*)` token を経由する (pre-commit `design-tokens` hook が検出)
- 色を単色ブランド (旧 Industrial Yellow) に寄せない。色は theme accent に追従させる
- `src/lib/components/ui/` を手動編集しない (shadcn-svelte scaffold)。例外は build / 型 error 修正のみ
- 選択肢が 1 個の menu を挟まない (button 押下 = 即 action)

## design token の正本

- token 値の正本は **コード** (`src/lib/styles/arcagate-theme.css`) にする。doc には token 体系の設計判断のみ書く
