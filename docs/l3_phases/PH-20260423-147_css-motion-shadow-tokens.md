---
status: todo
phase_id: PH-20260423-147
title: "CSS モーション・シャドウ・プリミティブトークン追加"
depends_on: []
scope_files:
  - src/lib/styles/arcagate-theme.css
parallel_safe: false
---

# PH-20260423-147: CSS モーション・シャドウ・プリミティブトークン追加

## 目的

`arcagate-theme.css` に以下を追加し、コンポーネントのハードコード値を置換できる
基盤を整える。同時に `--ag-shadow-dialog` の未定義バグ（6 箇所で参照済み・未定義）
を修正する。

## 実装ステップ

### Step 1: モーション変数追加

`:root` に追加:

```css
/* Motion: Duration */
--ag-duration-instant: 80ms;
--ag-duration-fast: 120ms;
--ag-duration-normal: 200ms;
--ag-duration-slow: 300ms;

/* Motion: Easing */
--ag-ease-in-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ag-ease-out: cubic-bezier(0.0, 0, 0.2, 1);
--ag-ease-in: cubic-bezier(0.4, 0, 1, 1);
--ag-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Step 2: シャドウ変数追加 + --ag-shadow-dialog 定義

`:root` に追加（未定義バグ修正含む）:

```css
/* Elevation / Shadow */
--ag-shadow-none: none;
--ag-shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--ag-shadow-md: 0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06);
--ag-shadow-dialog: 0 8px 32px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10);
--ag-shadow-palette: 0 16px 48px rgba(0,0,0,0.24), 0 8px 16px rgba(0,0,0,0.12);
```

`.dark` にオーバーライド（暗い背景に合わせた値）:

```css
--ag-shadow-sm: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
--ag-shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2);
--ag-shadow-dialog: 0 8px 32px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3);
--ag-shadow-palette: 0 16px 48px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4);
```

### Step 3: プリミティブレイヤ追加

`:root` 先頭に Primitive レイヤ（コメントで区画を明示）:

```css
/* === Primitive Layer (do not use directly in components) === */
--prim-gray-50: #f9fafb;
--prim-gray-100: #f3f4f6;
--prim-gray-200: #e5e7eb;
--prim-gray-900: #111827;
--prim-gray-950: #030712;
--prim-cyan-300: #67e8f9;
--prim-cyan-400: #22d3ee;
--prim-cyan-500: #06b6d4;
--prim-cyan-700: #0e7490;
--prim-red-400: #f87171;
--prim-amber-400: #fbbf24;
--prim-emerald-400: #34d399;
```

### Step 4: Reduced Motion 対応

`:root` の末尾に追加:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --ag-duration-instant: 0ms;
    --ag-duration-fast: 0ms;
    --ag-duration-normal: 0ms;
    --ag-duration-slow: 0ms;
  }
}
```

## 受け入れ条件

- [ ] `--ag-duration-{instant,fast,normal,slow}` が `:root` に定義されている
- [ ] `--ag-ease-{in-out,out,in,bounce}` が `:root` に定義されている
- [ ] `--ag-shadow-{none,sm,md,dialog,palette}` が `:root` / `.dark` 両方に定義されている
- [ ] `--ag-shadow-dialog` の参照 6 箇所がサイレントバグなしで動作する（定義済みなので）
- [ ] `@media (prefers-reduced-motion: reduce)` で全 duration が `0ms` になる
- [ ] `--prim-*` プリミティブ変数が追加されている
- [ ] `pnpm verify` 全通過
