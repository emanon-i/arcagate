---
id: PH-20260429-498
title: Industrial Yellow Halftone / Dot-Fade / Hatch Utility
status: todo
batch: 109
era: design-overhaul
parent_l1: REQ-007_visual-language
scope_files:
  - src/lib/styles/industrial-yellow.css
  - src/app.css
---

# PH-487: Halftone / Dot-Fade / Hatch Utility

## 背景

仕様: `industrial-yellow-spec.md` 中核モチーフ §1, §2。

ハーフトーン (印刷網点) / ドットフェード / 斜線ハッチは Industrial Yellow theme の**最重要モチーフ**。
工業ラベル・警戒帯・パネル角・ヘッダー・テーマ背景に多用。CSS utility として用意し、
全 widget / panel から再利用できるようにする。

## 受け入れ条件

### 機能

- [ ] **`.endfield-yellow-halftone`**: 蛍光黄地 + 黒ドット (radial-gradient 7px)
- [ ] **`.endfield-paper-dots`**: 紙地 + 薄黒ドット (radial-gradient 8px)
- [ ] **`.endfield-dot-fade`**: 黄ドット + radial mask で右下フェード (radial-gradient 9px + mask)
- [ ] **`.endfield-hatch`**: -45° 斜線 1px / 5px 間隔
- [ ] **適用 scope**: utility class は theme 非依存で全 page で使えるが、視覚的整合は Industrial Yellow theme 時のみ
- [ ] **Tailwind layer**: `@layer utilities` で定義、`hover:` `dark:` variant 適用可能

### 横展開チェック

- [ ] 既存 Endfield-builtin theme の contour grid (body::before) と衝突しない
- [ ] PH-490 で AppShell 背景に dot-fade を適用するとき utility 経由
- [ ] 既存 `--ag-backdrop` (Liquid Glass) と独立

### SFDIPOT

- **F**unction: 4 utility class が DOM 要素に適用すると視覚効果が出る
- **D**ata: CSS のみ、JS/TS 不要
- **I**nterface: Tailwind / Svelte template で `class="endfield-paper-dots"` 等
- **P**latform: WebView2 で radial-gradient + mask-image 描画 OK
- **T**ime: paint cost 軽微 (背景 layer のみ)

### HICCUPPS

- [Image] Arknights:Endfield の印刷網点 / 警戒帯モチーフ
- [Comparable] Material Design / Apple HIG と異なる工業 UI

## 実装ステップ

1. `industrial-yellow.css` に `@layer utilities { ... }` で 4 class 定義
2. `app.css` import 経由で global に提供
3. demo page (Storybook 風) は scope 外、PH-491 ホーム画面で実例
4. dark mode で `mask-image` の見え方確認 (Industrial Yellow theme は dark base なので問題なし)

## 規約参照

- `industrial-yellow-spec.md` 中核モチーフ §1-2
- ux_standards.md (motion / accessibility — `prefers-reduced-transparency` で dot-fade 軽減検討)

## 参考

- arcagate-theme.css の Endfield contour grid 実装 (body::before/after)
