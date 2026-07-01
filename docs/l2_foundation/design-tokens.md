# Design Tokens v2

> **目的**: 「色 1〜2 色を決めるだけで色全体は色彩学で自動生成、 aesthetic (glass / neumorph / brutalist) は直交軸として token で表現」 という design system の構造定義。
> **対象**: 全 frontend developer / agent。 component の見た目を書くときの token 選択基準。
> **永続性**: L2 design doc 中核。 `i18n-policy.md` / `button-usage.md` と並ぶ。
> **実装**: `src/lib/styles/arcagate-theme.css` / `src/lib/utils/color.ts` / `src/lib/state/a11y.svelte.ts`

---

## 0. 設計原則

**「seed (種) を最小限決め、 派生は CSS native の色計算に任せる」**。 theme 定義は seed 8 値 + aesthetic primitive の差し替えだけで済む。 theme ごとに全カラーを手で列挙しないため、 theme 追加時の手調整と不整合を避けられる。

WebView2 (Windows 11 / Chromium 系) は relative color `oklch(from …)` と `color-mix()` を完全サポートするため、 派生は **runtime の CSS 計算**で行い JS fallback は持たない。

---

## 1. 3 層構成

```
LAYER 1  color seeds          --c-*            theme / ThemeEditor が触る唯一の色入力
   │     (8 値 + scrim)
   ▼
LAYER 2  aesthetic primitives --radius/-surface/-shadow/-font/-bg-pattern/-decoration
   │     (色と直交、 glass/neumorph/brutalist を表現)
   ▼
LAYER 3  semantic tokens      --ag-*           component が直接参照する派生層
         (oklch(from …) / color-mix() で runtime 計算)
```

component は **LAYER 3 (`--ag-*`) のみ参照する**。 LAYER 1/2 を component から直接使わない。

---

## 2. LAYER 1 — color seeds (`--c-*`)

| seed             | 役割                    | 備考                                                            |
| ---------------- | ----------------------- | --------------------------------------------------------------- |
| `--c-bg`         | theme base 背景         | surface 階層はここから派生                                      |
| `--c-fg`         | theme base 前景 (文字)  | text 階層 / border はここから派生                               |
| `--c-primary`    | メインアクセント        | 必須                                                            |
| `--c-secondary`  | サブアクセント (任意)   | 未指定なら `oklch(from --c-primary l c h+180)` で補色を自動派生 |
| `--c-glass-tint` | frosted overlay の tint | 両 base で near-white                                           |
| `--c-warn`       | 警告色                  | hue 固定 (文化的意味)、 l/c のみ追従                            |
| `--c-error`      | エラー色                | hue 固定                                                        |
| `--c-success`    | 成功色                  | hue 固定                                                        |

補助: `--scrim` (modal overlay)、 `--scrim-dim` (clear glass の dim layer)。

seed の値は **oklch 推奨** (派生計算が知覚均等)。 ただし custom theme / ThemeEditor は `<input type="color">` 由来の **hex も可** — `oklch(from …)` / `color-mix()` は hex 入力も受理する。

---

## 3. LAYER 2 — aesthetic primitives (色と直交)

theme はこの群を差し替えて見た目の「素材感」を表現する。

| primitive group | token                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| 角丸            | `--ag-radius-sm` / `--ag-radius-md` / `--ag-radius-lg` ※                                      |
| glass 物理特性  | `--surface-blur` / `--surface-noise-opacity` / `--surface-border` / `--surface-shadow`        |
| dual shadow     | `--shadow-outer-light/-dark` / `--shadow-inner-light/-dark` (neumorph の内外影)               |
| text 効果       | `--text-effect-glow` / `--text-effect-stroke` (将来の aesthetic 用、 現状 builtin では未使用) |
| 背景 pattern    | `--bg-pattern` / `--bg-pattern-opacity` / `--bg-pattern-color` (brutalist の dot grid)        |
| 構造装飾        | `--decoration-bracket-corners` / `--decoration-tickmarks` / `--decoration-frame-border`       |
| font            | `--font-family-base` / `--font-family-display` / `--font-family-numeric`                      |

※ **命名注意**: aesthetic の角丸 primitive は `--radius-*` ではなく `--ag-radius-*`。 Tailwind v4 が `--radius-*` namespace を予約しており、 衝突すると循環参照になるため。 `--ag-radius-button` / `-card` / `-widget` 等 semantic alias はこの primitive を参照する。

motion (`--ag-duration-*` / `--ag-ease-*`) / spacing / typography scale は v1 から不変。

---

## 4. LAYER 3 — semantic tokens (`--ag-*`)

component が参照する派生層。 すべて **base 非依存** — `--c-bg` / `--c-fg` / `--c-primary` へ向けた `color-mix()` で表現するため、 light / dark どちらの base でも自動的に正しい方向 (dark は明るく持ち上げ / light は暗く沈める) に派生する。

代表例 (全量は `arcagate-theme.css` 参照):

```css
--ag-surface-1: color-mix(in oklab, var(--c-bg), var(--c-fg) 4%);   /* 持ち上げ */
--ag-text-secondary: color-mix(in oklab, var(--c-fg), var(--c-bg) 32%);
--ag-accent: var(--c-primary);
--ag-accent-bg: color-mix(in oklab, var(--c-primary), transparent 88%);
--ag-accent-text: color-mix(in oklab, var(--c-primary), var(--c-fg) 52%);
--ag-accent-tertiary: oklch(from var(--c-primary) l c calc(h + 120));
```

派生は意味別 semantic 名で公開する: `--ag-text-*` / `--ag-surface-*` / `--ag-border*` / `--ag-accent*` / `--ag-warm*` / `--ag-success*` / `--ag-error*` / `--surface-glass-regular` / `--surface-glass-clear` / `--interactive-default/-hover/-active` / `--scrim` 等。

---

## 5. ガラス面の物理積層

「ノイズが文字の上に乗る」 問題の根本対処として、 glass 面は pseudo-element で **物理的に層を分離**する。 `.ag-glass` クラスを付けると:

```
base 要素 : backdrop-filter blur + 半透明 fill          (z auto)
::before  : noise grain (SVG fractalNoise 0.9)          (z 0、 pointer 透過)
::after   : 上端 highlight border                        (z 0、 pointer 透過)
直 child  : 実 content                                   (z 1 — noise より上、 文字鮮明)
```

`.ag-glass-clear` は加えて base の background-color に **dim layer** (`--scrim-dim`) を 1 段挟む (Apple Liquid Glass の「光抑えレイヤー」相当、 透明度が高い面で content の可読性を担保)。

noise opacity / blur 強度は LAYER 2 primitive (`--surface-noise-opacity` / `--surface-blur`) で theme ごとに制御。

---

## 6. ビルトインテーマ (6 本)

全 theme は seed + aesthetic primitive の組合せ。 CSS は単一 token システムで、 theme は `:root` / `.dark` / `[data-theme]` block で seed と aesthetic を切替えるだけ。

| theme              | base  | aesthetic                                                                    |
| ------------------ | ----- | ---------------------------------------------------------------------------- |
| **Dark**           | dark  | glass — Regular frosted、 blur 16px、 noise 4%、 soft long shadow            |
| **Light**          | light | whisper — 控えめ glass、 blur 8px、 noise 0%、 極薄 shadow、 cool 寄り淡背景 |
| **Brutalist Dark** | dark  | 黒地 + 1 accent + dotted grid + mono display font + radius 0 + 1px solid     |
| **Brutalist**      | light | モノクロ + 1 accent + dotted grid + mono display font + radius 0 + 1px solid |
| **Neumorph Dark**  | dark  | 深 surface + dark-shifted dual shadow、 blur 無し                            |
| **Neumorph**       | light | pastel solid + inner/outer dual shadow、 blur 無し                           |

builtin は **3 系統 × Dark/Light の 6 本構成**。 並び順は `themes.sort_order` で固定 (dark / light / brutalist-dark / brutalist / neumorph-dark / neumorph)。 Dark / Light は `.dark` class 切替 (flat、 `[data-theme]` を使わない)。 Brutalist / Neumorph は `[data-theme="<id>"]` block。

「Liquid Glass」 表記は user 向け表示にも内部実装にも使わない (naming ban)。

---

## 7. ランダム色 / custom theme

`src/lib/utils/color.ts`:

- `randomSeedPair(aesthetic, bgHex, …)` — aesthetic ごとの chroma/lightness レンジ (spec D) で harmony pair を生成。 harmony angle は 30/60/120/150/180° から選択。 secondary は背景と WCAG AA (≥3:1) を満たすまで最大 10 回 re-roll、 落ちたら fallback。
- `oklchToHex` / `cssColorToHex` / `contrastRatio` — 色変換 / コントラスト検証。

custom theme は `themes.css_vars` (JSON) に seed override を保持。 ThemeEditor は primary 必須 / secondary 任意の color picker + ランダムボタン + advanced (全 token 生値編集) を提供し、 変更は即 documentElement に反映 (live preview)。

---

## 8. アクセシビリティ override

`src/lib/state/a11y.svelte.ts` が 3 トグルを `<html>` の data-* 属性として反映。 `arcagate-theme.css` が aesthetic token を上書きする:

| トグル               | data 属性                  | 効果                                              |
| -------------------- | -------------------------- | ------------------------------------------------- |
| 透明度を下げる       | `data-reduce-transparency` | blur / noise / glass 半透明を撤去 → solid surface |
| コントラストを上げる | `data-increase-contrast`   | border 強化 / text の base 混合を弱める           |
| 動きを減らす         | `data-reduce-motion`       | duration を 0、 全 animation/transition を 0 に   |

設定は localStorage に永続化、 起動時 (初回 paint 前) に side-effect import で即適用。

---

## 9. ハードコード禁止 (audit)

component (`.svelte` / `.css`、 `ui/` `app.css` `arcagate-theme.css` `themes/` を除く) で **生の見た目値を書かない**:

- 生 hex / rgb / rgba / hsl / **oklch / oklab**
- token を経由しない **box-shadow の生色**

→ すべて `--ag-*` / `--c-*` / `--surface-*` 等の token 経由。 `scripts/audit-design-tokens.sh` (pre-commit hook + `pnpm audit:all`) が機械検出する。

例外: `filter: blur(Npx)` の dynamic blur (wallpaper 等の user 値) は token 化対象外。 glass 面の blur は `--surface-blur` token を使うこと。

---

## 10. component が token を選ぶ基準

| 用途                | token                                                      |
| ------------------- | ---------------------------------------------------------- |
| 背景 (panel / card) | `--ag-surface-0`〜`-4` / `--ag-surface-opaque`             |
| glass 面            | `.ag-glass` / `.ag-glass-clear` クラス                     |
| 文字                | `--ag-text-primary` / `-secondary` / `-muted` / `-faint`   |
| 境界線              | `--ag-border` / `-hover` / `-dashed`                       |
| アクセント          | `--ag-accent` / `-bg` / `-border` / `-text` / `-secondary` |
| 状態色              | `--ag-warm-*` / `--ag-success-*` / `--ag-error-*`          |
| 角丸                | `--ag-radius-button` / `-card` / `-widget` / `-window` 等  |
| 影                  | `--ag-shadow-sm` / `-md` / `-lg` / `-dialog` / `-palette`  |
| motion              | `--ag-duration-*` / `--ag-ease-*`                          |

新しい色が必要になったら **seed から派生する semantic token を `arcagate-theme.css` に足す**。 component に直書きしない。
