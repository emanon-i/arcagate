---
id: PH-20260428-490
title: Industrial Yellow 背景レイヤー (等高線 + dot-fade) AppShell 適用
status: todo
batch: 108
era: design-overhaul
parent_l1: REQ-007_visual-language
scope_files:
  - src/lib/styles/industrial-yellow.css
  - src/routes/+layout.svelte (or AppShell)
---

# PH-490: 背景レイヤー (等高線 + dot-fade) AppShell 適用

## 背景

仕様: `industrial-yellow-spec.md` 中核モチーフ §3 + レイアウト・構図「背景：薄いノイズ + 巨大図形 + 等高線 + ぼかし + ビネット」。

Industrial Yellow theme 時の AppShell 全体背景に**薄い等高線 + dot-fade + ノイズ + ビネット**を
レイヤー構造で適用。既存 Endfield-builtin theme の contour grid と類似だが、
Industrial Yellow は工業端末感を強める方向 (黄ドットフェード追加、等高線は薄め)。

## 受け入れ条件

### 機能

- [ ] **背景 4 層構造** (`[data-theme="theme-industrial-yellow"] body::before` + `::after` + container layer):
  - L1: 黒地 `--ag-bg`
  - L2: 等高線 (薄い、`body::before` repeating-linear-gradient 横+縦、opacity 0.04)
  - L3: dot-fade (右下 corner、`body::after` PH-487 utility class 流用 or inline)
  - L4: ノイズ (`url("data:image/svg+xml,...")` SVG fractalNoise)
  - L5: ビネット (`radial-gradient ellipse at center` で中央明るく端暗く、覆う)
- [ ] **「等高線を主役にしない」**: opacity 0.03〜0.06 で抑える (禁忌 §3 遵守)
- [ ] **`prefers-reduced-transparency` で軽量化**: dot-fade と vignette を opacity 0 に
- [ ] **既存 Liquid Glass theme の `--ag-backdrop` と独立** (Industrial Yellow は backdrop なし)
- [ ] **PH-476 Mica/Acrylic との関係**: Industrial Yellow theme 時は Mica/Acrylic を **無効化** (黒地統一)

### 横展開チェック

- [ ] palette window (transparent: true、PH-046) は Industrial Yellow theme 適用時も独立背景
- [ ] Settings dialog (PH-044 2-pane) は内部 paper panel で背景上書き
- [ ] Endfield-builtin theme の body::before/after と data-theme attribute で排他

### SFDIPOT

- **F**unction: theme 切替で背景全体が一瞬で変わる
- **D**ata: CSS のみ
- **I**nterface: AppShell 触らず CSS で完結
- **P**latform: WebView2 で multi-layer gradient + SVG noise OK
- **T**ime: paint cost: layer 4 でやや重いが、static background なので scroll 中影響なし

### HICCUPPS

- [Image] 仕様「黒い工業空間」直訳
- [Statutes] a11y: prefers-reduced-transparency / prefers-reduced-motion 対応

## 実装ステップ

1. `industrial-yellow.css` の `[data-theme="theme-industrial-yellow"]` block に body 背景 4 層追加
2. body::before で等高線 (40px 縦 / 60px 横 repeating-linear-gradient、cyan #62 系を mute)
3. body::after で dot-fade (PH-487 .endfield-dot-fade) を右下に固定
4. body 自身に noise SVG + vignette radial-gradient
5. PH-476 Mica/Acrylic の Rust 側 setup は Industrial Yellow theme 時には skip (frontend で window.set_decorations 等は触らない、CSS で覆う)
6. `@media (prefers-reduced-transparency: reduce)` で軽量 fallback

## 規約参照

- `industrial-yellow-spec.md` 中核モチーフ §3 + 禁忌 §3 (等高線主役 NG)
- ux_standards.md a11y (prefers-reduced-* 対応)

## 参考

- arcagate-theme.css の Endfield contour grid 実装パターン
- PH-476 Mica/Acrylic 適用ロジック (`src-tauri/src/lib.rs` setup)
