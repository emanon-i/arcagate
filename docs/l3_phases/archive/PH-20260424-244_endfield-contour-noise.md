# PH-20260424-244 Endfield テーマ 等高線 + ノイズ実装

- **フェーズ**: batch-58 Plan A（改善 1）
- **status**: done
- **開始日**: -

## 目的

実機フィードバック: Endfield テーマに等高線・ノイズテクスチャが存在しない。
`design_system_architecture.md §4` の 5 層合成モデル（solid → contour → noise → surface）を
CSS 構造ルールとして `arcagate-theme.css` に実装し、他テーマとの視覚差を明確にする。

## 技術方針

### 等高線（Contour Lines）

`[data-theme="theme-builtin-endfield"] body::before` で疑似要素を生成し、
`repeating-linear-gradient` の組み合わせで地形図風グリッド線を描画。

```css
background-image:
  repeating-linear-gradient(
    0deg,
    transparent,
    transparent 39px,
    rgba(0, 200, 224, 0.06) 39px,
    rgba(0, 200, 224, 0.06) 40px
  ),
  repeating-linear-gradient(
    90deg,
    transparent,
    transparent 59px,
    rgba(0, 200, 224, 0.03) 59px,
    rgba(0, 200, 224, 0.03) 60px
  );
```

- opacity: 0.06〜0.10 程度（控えめだが視認できる水準）
- `position: fixed; inset: 0; z-index: 0; pointer-events: none`

### ノイズテクスチャ

SVG `feTurbulence` を Data URI でインライン化し `body::after` に配置。
CSS ベースのランダムノイズ（`image-noise` polyfill 不要）。

```css
background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
background-repeat: repeat;
```

### CSS vars 強化

migration 011 の Endfield 定義に以下を追加（新 migration `013_endfield_enhanced.sql`）:

- `--ag-surface-page`: `#0d1422`（現在 .dark の値 `#090b10` より少し明るい深青）
- `--ag-surface-0`: `#111929`
- `--ag-radius-card`: `8px`（角丸小さめ → HUD 感）
- `--ag-radius-widget`: `10px`
- `--ag-accent`: `#3ecfcf`（より強いシアン発光）
- `--ag-accent-border`: `rgba(62,207,207,0.5)`（ボーダー強め）
- `--ag-border`: `rgba(62,207,207,0.18)`（シアン寄りボーダー）

## 受け入れ条件

- [ ] Endfield 切替時に body に等高線グリッドが視認できる（opacity 0.06 程度）
- [ ] ノイズテクスチャが body 背景に重なっている
- [ ] 角丸が他テーマより小さく HUD 感がある
- [ ] Flat（ライト/ダーク）との視覚差が明確
- [ ] `pnpm verify` 全通過
