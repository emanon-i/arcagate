# 6 Builtin Theme 差分マトリクス — 「いま何が違って何が同じか」 (DEV_REVIEW_R4 ⑫後半 判断材料)

対象: 6 builtin theme (`dark` / `light` / `brutalist` / `brutalist-dark` / `neumorph` /
`neumorph-dark`) の **token 定義 + 実描画 + UI usage** を全網羅し、 「user が現状で感じる差」
と 「定義はあるが UI に出ていない差」 を客観整理する。

DEV_REVIEW_R4 ⑫ 後半 (「もっと各テーマに差があれば」 という user フィードバック) の design 案を
出す前段として、 **どこに既に差があり / どこは同じすぎるか** を確定させる resource。

- 解析時点 main HEAD = `7646fa0a` (PR #586 までマージ済)。
- 解析方法: migration 043 + `arcagate-theme.css` の static block を**全 token 抽出**、 実機 dev
  (Tauri + Vite + CDP 9222) で 6 theme を順次 active 化して `getComputedStyle` 実測、 各 token
  の UI 参照箇所を grep で網羅。 screenshot 6 枚 (Library 画面) を Library で実機キャプチャ。
- **本ドキュメントは分析のみで、 コードは一切変更していない。**

---

## TL;DR — 「user は何が違うと感じるか」

実機 screenshot (Library 画面) + computed style 実測の総括:

| 観点                                    | glass dark              | glass light        | brutalist                                    | brutalist-dark                 | neumorph            | neumorph-dark       | **6 theme で実際に変わるか?**                       |
| --------------------------------------- | ----------------------- | ------------------ | -------------------------------------------- | ------------------------------ | ------------------- | ------------------- | --------------------------------------------------- |
| 主背景 (`--c-bg`)                       | 濃灰青 L0.17            | 薄灰青 L0.985      | 純白 L0.99                                   | 純黒 L0.14                     | 薄藤色 L0.93        | 暗藤色 L0.22        | **明確に差**: 各 base で hue / lightness が違う     |
| 主文字 (`--c-fg`)                       | 白 L0.96                | 濃灰 L0.22         | 純黒 L0.16                                   | 純白 L0.96                     | 紫灰 L0.34          | 淡藤 L0.92          | **明確に差**: light/dark で反転 + neumorph は紫帯   |
| 角丸 (`--ag-radius-lg`)                 | 22px                    | 22px               | **0px**                                      | **0px**                        | **24px**            | **24px**            | **強い差**: brutalist 完全直角、 neumorph 太角丸    |
| カード影 (`--ag-shadow-md`)             | soft drop               | soft drop (淡)     | **none**                                     | **none**                       | **dual shadow**     | **dual shadow**     | **強い差**: 3 aesthetic で影の質が完全に違う        |
| Dialog 影 (`--ag-shadow-dialog`)        | drop blur               | drop blur (淡)     | **6px offset solid**                         | **6px offset solid (白)**      | dual shadow         | dual shadow (深)    | **明確に差**                                        |
| backdrop blur (`--surface-blur`)        | **blur(16px) sat 180%** | blur(8px) sat 160% | **none**                                     | **none**                       | **none**            | **none**            | **dark glass のみ強、 他はゼロまたは弱**            |
| Glass noise (`--surface-noise-opacity`) | **0.04**                | 0                  | 0                                            | 0                              | 0                   | 0                   | **dark glass のみ** に微弱 grain                    |
| 背景 dot grid (`body::before`)          | なし                    | なし               | **dot grid 0.06 opacity**                    | **dot grid 0.10 opacity (白)** | なし                | なし                | **brutalist 2 本のみ** に全画面 dot 背景            |
| 文字フォント                            | system UI               | system UI          | system UI (定義は monospace だが **未使用**) | 同上                           | system UI           | system UI           | **定義に差はあるが UI で見えない (§4 参照)**        |
| アクセント (`--c-primary`)              | 青 L0.50 C0.14 H215     | 同                 | 赤橙 L0.50 C0.22 H28                         | 赤橙 L0.50 C0.20 H28           | 紫 L0.50 C0.10 H280 | 紫 L0.50 C0.10 H280 | **hue は明確に違う** が **使われる面積が極小 (§3)** |

要点:

- **強い差**: 角丸 / 影の質 / blur / 背景 dot grid → 視覚的に theme を切り替えると即わかる。
- **隠れて出ない差**: アクセントカラー (`--c-primary`) は UI 全体で **8 file の小さな chip / ring** にしか使われず、 「primary を変えたのに見た目あんまり変わらない」 という ⑪ 後半 user 感覚の構造的源泉。
- **完全 dead な差**: brutalist の `--font-family-display: 'Cascadia Code'` は **どの component も参照していない** ため UI に一切出ない (§4)。 brutalist の世界観 (タイプライター調) を表現する意図が宙に浮いている。
- **付随する leak**: applyTheme の reset が `--c-*` / `--ag-*` のみ対象で `--bg-pattern*` / `--font-family-*` / `--surface-*` / `--shadow-*` は reset しないため、 brutalist → dark に切替えると brutalist の inline style が **残骸として持続**する (§5 incidental bug)。 視覚 rendering は `[data-theme]` CSS rule が制御するため実害は薄いが、 token 値が theme と矛盾する状態は意図と乖離する。

---

## 1. Token 定義 — どこで何が決まっているか

### 1.1 SSOT の二重化

`themes.css_vars` (DB seed via migration 043) と `arcagate-theme.css` の `:root` / `.dark` /
`[data-theme='X']` block が **二重定義**。 audit doc `THEME_CLONE_AESTHETIC_LOST_2026-05-26.md`
で defense-in-depth として残置することが確定 (brutalist の `body::before` は CSS variable で
表現不能なため CSS 削除不可)。

- migration 043 = `cloneTheme` の source として参照 (user が複製した時にここから JSON を copy)
- `arcagate-theme.css` の `[data-theme='X']` block = 実描画の SSOT (active 時に該当 selector が effect)
- 「主要 token が両者で一致」 を `scripts/audit-builtin-theme-css-vars.sh` が gate

### 1.2 token 定義の出元 inventory (6 theme × 主要 token)

下表は実機 CDP `getComputedStyle()` で採取した live 値 (computed value、 CSS variable の派生
前)。 数値は OKLCH または px / 関数表現で原形を保つ。

#### LAYER 1 color seeds

| token            | dark                        | light                    | brutalist                              | brutalist-dark               | neumorph                    | neumorph-dark           |
| ---------------- | --------------------------- | ------------------------ | -------------------------------------- | ---------------------------- | --------------------------- | ----------------------- |
| `--c-bg`         | `oklch(0.17 0.013 260)`     | `oklch(0.985 0.003 250)` | `oklch(0.99 0 0)`                      | `oklch(0.14 0 0)`            | `oklch(0.93 0.012 270)`     | `oklch(0.22 0.012 270)` |
| `--c-fg`         | `oklch(0.96 0.004 250)`     | `oklch(0.22 0.02 260)`   | `oklch(0.16 0 0)`                      | `oklch(0.96 0 0)`            | `oklch(0.34 0.02 270)`      | `oklch(0.92 0.01 270)`  |
| `--c-primary`    | `oklch(0.50 0.14 215)` (青) | 同                       | `oklch(0.50 0.22 28)` (赤橙)           | `oklch(0.50 0.20 28)` (赤橙) | `oklch(0.50 0.10 280)` (紫) | 同                      |
| `--c-secondary`  | derive (`h + 180`)          | derive                   | `oklch(0.50 0.22 28)` (primary と同値) | 同                           | derive                      | derive                  |
| `--c-glass-tint` | `oklch(0.99 0.004 250)`     | 同                       | `oklch(1 0 0)`                         | `oklch(0.16 0 0)`            | `oklch(0.99 0.004 270)`     | `oklch(0.99 0.004 270)` |
| `--c-warn`       | L0.82 C0.15 H80             | L0.74 C0.16 H75          | L0.62 C0.18 H75                        | L0.70 C0.16 H75              | L0.78 C0.11 H75             | L0.78 C0.13 H75         |
| `--c-error`      | L0.68 C0.17 H25             | L0.58 C0.20 H25          | L0.52 C0.22 H25                        | L0.58 C0.20 H25              | L0.64 C0.14 H25             | L0.64 C0.16 H25         |
| `--c-success`    | L0.78 C0.14 H155            | L0.66 C0.15 H150         | L0.55 C0.16 H150                       | L0.62 C0.15 H150             | L0.72 C0.10 H150            | L0.66 C0.13 H150        |

観察:

- **primary は 3 系統 ×ペアで同色**: glass=H215 blue / brutalist=H28 red / neumorph=H280 purple。
  hue 軸でははっきり区別。
- **warn/error/success は theme ごとに微調整**だが、 hue は近接 (warn=75-80 / error=25 / success=150-155)。
  semantic 色は theme に強く依存させない方針 (= 信号性を維持)。

#### LAYER 2 aesthetic primitives

| token                     | dark                      | light                | brutalist             | brutalist-dark        | neumorph         | neumorph-dark    |
| ------------------------- | ------------------------- | -------------------- | --------------------- | --------------------- | ---------------- | ---------------- |
| `--ag-radius-sm`          | 8px                       | 8px                  | **0px**               | **0px**               | **12px**         | **12px**         |
| `--ag-radius-md`          | 14px                      | 14px                 | **0px**               | **0px**               | **18px**         | **18px**         |
| `--ag-radius-lg`          | 22px                      | 22px                 | **0px**               | **0px**               | **24px**         | **24px**         |
| `--surface-blur`          | **`blur(16px) sat 180%`** | `blur(8px) sat 160%` | **`none`**            | **`none`**            | **`none`**       | **`none`**       |
| `--surface-noise-opacity` | **0.04**                  | 0                    | 0                     | 0                     | 0                | 0                |
| `--ag-backdrop`           | `blur(16px) sat 180%`     | `blur(8px) sat 160%` | `none`                | `none`                | `none`           | `none`           |
| `--bg-pattern`            | (default `none`)          | (default `none`)     | **`dots`**            | **`dots`**            | (default `none`) | (default `none`) |
| `--bg-pattern-opacity`    | 0                         | 0                    | **0.06**              | **0.10**              | 0                | 0                |
| `--font-family-display`   | system UI                 | system UI            | **`'Cascadia Code'`** | **`'Cascadia Code'`** | system UI        | system UI        |

#### Surface / Border / Shadow (派生 + override)

| token                      | dark                               | light                 | brutalist                                  | brutalist-dark | neumorph                       | neumorph-dark        |
| -------------------------- | ---------------------------------- | --------------------- | ------------------------------------------ | -------------- | ------------------------------ | -------------------- |
| `--ag-surface-opaque`      | `color-mix(c-bg, c-fg 4%)`         | 同式                  | **`var(--c-bg)` (mix なし、 純 bg)**       | 同             | **`var(--c-bg)`**              | **`var(--c-bg)`**    |
| `--ag-border`              | `color-mix(c-fg, transparent 88%)` | 同式                  | **`var(--c-fg)` (透過なし、 純 fg)**       | 同             | (default `color-mix`)          | (default)            |
| `--ag-shadow-md`           | drop shadow 0.4/0.2                | drop shadow 0.12/0.06 | **`none`**                                 | **`none`**     | **dual shadow (outer)**        | **dual shadow (深)** |
| `--ag-shadow-lg`           | drop shadow 0.5/0.3                | drop shadow 0.18/0.1  | **`none`**                                 | **`none`**     | **dual shadow**                | **dual shadow**      |
| `--ag-shadow-dialog`       | drop blur 0.5/0.3                  | drop blur 0.18/0.1    | **`6px 6px 0 var(--c-fg)`** (offset solid) | **同 (白)**    | dual shadow                    | dual shadow (深)     |
| `--ag-shadow-palette`      | drop blur 0.6/0.4                  | drop blur 0.24/0.12   | **`8px 8px 0 var(--c-fg)`**                | 同 (白)        | dual shadow                    | dual shadow          |
| `--ag-widget-shadow-hover` | `var(--ag-shadow-md)`              | 同                    | **`4px 4px 0 var(--c-fg)`**                | 同 (白)        | `var(--shadow-inner-*)` (内側) | 同                   |

観察: **角丸 / 影 / blur が aesthetic を最も強く規定**。 色 (`--c-primary`) より構造 token の方が
視覚インパクトが大きい。

---

## 2. UI usage — token は実際にどこに出るか

### 2.1 `--c-primary` (= `--ag-accent`) の出現面積

| 用途                                                  | file 数                                        | 主な場所                                                                                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-[var(--ag-accent)]` (ベタ塗り)                    | **8 file**                                     | LibraryCard (starred badge)、 LibraryDetailActions (起動 button)、 LibraryItemPicker、 WidgetHandles、 Switch (ON 状態)、 SetupWizard、 SnippetWidget、 SystemMonitorWidget |
| `var(--ag-accent)` 全体 (border / ring / text 等含む) | 67 出現 (約 30 file)                           | focus ring / 選択 ring / accent text 等の **細い線・小 chip 用途**                                                                                                          |
| `var(--ag-accent-secondary)`                          | **ThemeEditor のみ** (= 編集 UI 自身)          | production UI に**ゼロ**                                                                                                                                                    |
| `var(--ag-accent-tertiary)`                           | **1 file** (PaletteOverlay の radial gradient) | bottom-right の極めて控えめな tint                                                                                                                                          |

**含意**: アクセントカラーは UI 全体の中で「小さな chip / ring / focus」 を担うだけで、 dominant
surface (sidebar / card / dialog) には出ない。 `--c-primary` を変えても UI の見た目はせいぜい
1-2% の領域が変わるだけ。 これが ⑪ 後半 (chain fix 後も「もっと変わってほしい」) の構造的根拠。

### 2.2 構造 token (radius / shadow / glass) の出現面積

| token                                 | file 数                                                | 主な場所                                                      |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| `var(--ag-radius-*)`                  | **17 file** (Card / WidgetShell / Dialog / Tip / Stat) | 全 card / dialog / chip の rounded                            |
| `var(--ag-shadow-*)`                  | **47 出現 / ~20 file**                                 | 全 card / dialog / palette / widget の落ち影                  |
| `.ag-glass` / `.ag-glass-clear` class | **13 file**                                            | dialog / palette / sidebar overlay / widget shell の glass 面 |
| `var(--surface-blur)`                 | `.ag-glass` (`backdrop-filter`) 経由で全 glass 面      | dialog / palette / context menu / settings panel              |
| `body::before` (dot grid)             | brutalist 2 theme のみ effect                          | 全画面 fixed overlay (Library / Workspace / Settings 共通)    |

**含意**: 角丸 / 影 / blur は **dominant な visual surface** に効くため、 theme 切替時の体感差は
これらが支配的に作る。 brutalist の dotted grid は body 全体覆うので最も劇的な差を与える。

### 2.3 「定義はあるが UI に出ていない」 token (= 死蔵)

| token                                                   | brutalist で override                     | UI 参照                                            | 状態                                                            |
| ------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `--font-family-display: 'Cascadia Code', ...`           | あり (2 theme)                            | **`src/lib` で参照 0 件** (theme.css 内の定義のみ) | **完全死蔵** — brutalist のタイプライター調表現が実現していない |
| `--ag-accent-secondary` (= `var(--c-secondary)` derive) | brutalist は primary と同値で意図的に同色 | ThemeEditor の color picker のみ                   | **production 死蔵**                                             |
| `--ag-accent-tertiary` (= `oklch(from primary h+120)`)  | 全 theme で auto 派生                     | PaletteOverlay の radial 1 箇所のみ (10% opacity)  | **ほぼ死蔵**                                                    |

`--font-family-display` の死蔵は ⑫ 後半 design feedback で **最も即効性のある改善余地** —
brutalist で見出し / 大型文字 / sidebar 見出しを monospace に切替えれば aesthetic identity が
劇的に補強される (font 自体は既に定義済み、 UI 適用するだけ)。

---

## 3. 実機 screenshot による差分検証 (Library 画面)

実機 dev (Tauri + Vite + CDP 9222) で 6 theme を順次 active 化、 Library デフォルト画面の
スクリーンショット (1000×750) を採取。 全画面で **同一 state** (104 item / exe タブ / grid view)。

スクリーンショットファイル (`tmp/theme-screenshots/`, 本 PR には commit しない):

- `dark.png` — 濃灰青 base、 cyan accent chip、 soft drop shadow、 微弱 glass noise
- `light.png` — 薄灰青 base、 cyan-tinted accent、 ごく弱い shadow + soft blur
- `brutalist.png` — 純白 base、 pink-red accent chip、 thin fg border、 dot grid 全画面 (淡)
- `brutalist-dark.png` — 純黒 base、 deep-red accent chip、 thin white border、 dot grid (やや明)
- `neumorph.png` — 薄藤 base、 lavender accent chip、 dual shadow で puffy 立体感、 大角丸
- `neumorph-dark.png` — 暗藤 base、 deep purple accent、 dual shadow 内寄り、 大角丸

screenshot 視覚観察 (Library 同一 state での 6 theme 比較):

| 視覚要素                                         | dark                   | light                | brutalist                           | brutalist-dark                          | neumorph                     | neumorph-dark              |
| ------------------------------------------------ | ---------------------- | -------------------- | ----------------------------------- | --------------------------------------- | ---------------------------- | -------------------------- |
| sidebar / main エリアの**基本構造 / レイアウト** | 完全同一               | 同一                 | 同一                                | 同一                                    | 同一                         | 同一                       |
| 「Library」 タブ button (active)                 | cyan teal pill         | cyan tinted          | red oblong                          | dark red                                | lavender                     | deep purple                |
| 「exe」 sidebar row (active)                     | cyan box               | cyan tinted          | **pink box (角丸)**                 | dark red box                            | lavender box                 | deep purple box            |
| カード (Total items 等) の輪郭                   | 22px 角丸 + 浮き出し感 | 22px 角丸 + 弱い浮き | **0 角丸 + thin border、 平面**     | **0 角丸 + thin white border**          | **24px 角丸 + puffy 立体感** | **24px 角丸 + 深い立体感** |
| カード背景                                       | 濃灰青 グラデ          | 灰青 グラデ          | **純白 + 細枠**                     | **純黒 + 細白枠**                       | **bg 同色 + dual shadow**    | **bg 同色 + dual shadow**  |
| 全画面 dot grid 背景                             | なし                   | なし                 | **あり (淡 1px dots、 16px pitch)** | **あり (やや明 1px dots、 16px pitch)** | なし                         | なし                       |
| 大型ヘッダ / 見出しの font                       | system UI              | system UI            | system UI (← monospace 未適用)      | system UI (← 同上)                      | system UI                    | system UI                  |

要点: 「カードの形状 + dot grid + 立体感の質」 が theme を即識別できる支配要因。 一方で **font /
sidebar 余白 / カードレイアウト** は全 theme で完全に同一。

---

## 4. 「同じすぎる」 と感じる場所、 「目立つべきなのに目立たない」 場所

user の「もっと差があればなぁ」 の構造的根拠を整理:

### A. 同じすぎる場所 (= 全 theme で完全に同一)

1. **font-family**: system UI (`ui-sans-serif, system-ui, ...`) が `--font-sans` / `--font-content`
   経由で全 theme で同一適用される。 brutalist が定義している `--font-family-display` は
   **UI で参照されない死蔵 token** (§2.3)。
2. **レイアウト寸法**: sidebar 幅 / card サイズ (S/M/L 3 段階だが theme 非依存) / 余白 / グリッド
   サイズ。 全 theme で 1px 単位で同一。
3. **アイコン色**: lucide icons は `currentColor` 継承で `--ag-text-*` 派生 → fg seed の hue
   差程度しか出ない。 アイコン自体は theme 非識別。
4. **canvas dot grid (workspace)**: `--ag-canvas-dot` は全 theme で `color-mix(c-fg, transparent 86%)`
   の同じ式。 dark/light で見える / 見えないだけで、 aesthetic 識別には寄与しない。

### B. 目立つべきなのに目立たない場所

1. **アクセントカラー (`--c-primary`)**: theme の hue 識別の主軸として設計されているが、
   UI 面積が極小 (§2.1) のため切替時の体感が薄い。
2. **brutalist の monospace 意図**: `--font-family-display` が定義されているのに **どこも参照
   していない**。 brutalist の鋭利 + 機械的 aesthetic を支える最大の要素が UI で表に出ていない。
3. **secondary / tertiary accent**: 補色 / 三角配色を `--c-secondary` / `--ag-accent-tertiary`
   で auto 派生する仕組みがあるが、 UI で使われるのは PaletteOverlay の 1 箇所 (radial gradient
   10% opacity) のみ (§2.3)。 「triadic 配色を活かす theme」 は構造的に成立しない状態。
4. **theme 固有の文化的シグナル**: 「brutalist = タイプライター + 直角 + 影なし」 のうち、
   直角 + 影なしは効いている (§1.2)。 タイプライター (= monospace 見出し) が抜けている。
   neumorph も「puffy 立体感」 は dual shadow で効いているが、 user フィードバック的には
   「全体的に紫っぽい」 程度の印象にしか残らない (= bg の hue 270 の弱い影響が大半)。

### C. 副次的: applyTheme reset の leak (incidental)

`theme.svelte.ts` の `applyTheme()` は inline style 再適用前に `--c-*` と `--ag-*` だけを
removeProperty する。 brutalist の `--bg-pattern: dots` / `--font-family-display: 'Cascadia Code'` /
`--shadow-outer-*` (neumorph の dual shadow primitive) 等の prefix が異なる token は **reset
されず inline に残骸**。 視覚 render は `[data-theme='X']` CSS rule が制御するので実害は薄いが、
理屈上 token 値が active theme と乖離した状態が持続する。

これは本 audit doc の主題 (theme 差分) とは別軸の bug。 修正は `applyTheme()` の reset prefix
list を拡張する 1 行修正で済むが、 本 PR の範囲外。

---

## 5. 「差を強化する」 ための選択肢の **再評価** (DEV_REVIEW_R4 §4 続編)

audit doc `DEV_REVIEW_R4_THREE_DEFECTS_2026-05-27.md` §4 で挙げた 5 案 (α surface tint / β
widget header border / γ icon 色 / δ surface も変える / ε 文言で説明) を、 本 audit で得た
事実に基づき再評価:

| 案                                               | 効果 (本 audit に照らして)                                                                                                                                                                                                                       | コスト                                                                                            | 副作用                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **新提案 ζ. font-family-display を実 UI に適用** | brutalist 限定で大型文字 / 見出し / sidebar 見出しを `var(--font-family-display)` 経由で `Cascadia Code` に切替。 既に定義済 token を **死蔵から救出**するだけで brutalist の identity が劇的に強化される。 死蔵 token 救出 ≈ 最小コスト最大効果 | 極小 (Tailwind の `font-display` utility を新設 → 既存大型文字に class を当てる、 1 PR 数十 file) | system フォントへの慣れと外れる UI 文字なので user 評価が分岐する。 brutalist 限定なので 4 theme は不変                        |
| α. surface tint に primary を混ぜる              | dominant 領域に primary を混ぜると差が顕著に出る                                                                                                                                                                                                 | 中 (color-mix 比率調整)                                                                           | brutalist の純白 bg が消える、 aesthetic と衝突                                                                                |
| β. widget header / sticky bar に primary border  | accent 露出面積を増やすが「UI の重さ」 が増える                                                                                                                                                                                                  | 小                                                                                                | brutalist 系で線が増えすぎる                                                                                                   |
| γ. icon 色を primary 派生に                      | アイコン全体が theme に同期                                                                                                                                                                                                                      | 小                                                                                                | a11y / 認知負荷                                                                                                                |
| δ. surface の hue も theme で変える              | 「theme = 世界観」 が出る                                                                                                                                                                                                                        | 大 (各 theme 個別 surface)                                                                        | neumorph 紫系 / brutalist 純白 は既に hue 持ち。 もっと強化する意味で言うなら glass dark を「真の宇宙黒 + cyan tint」 等にする |
| ε. 文言で「アクセント色」 と明示                 | 期待値を調整                                                                                                                                                                                                                                     | 0                                                                                                 | user 体験そのものは変わらない                                                                                                  |

**推奨優先順 (本 audit の事実から導出)**:

1. **ζ (font-family-display 救出)** — brutalist の identity を最も大きく補強。 既に定義済の
   死蔵 token を活用、 設計矛盾の解消も兼ねる。 user 確認 1 回で実装方針確定。
2. 上記 + α / β を brutalist のみに適用 (= brutalist の差を更に強化、 他 theme は不変)。
3. δ (surface hue 差別化) は brutalist 以外も含めて再設計が必要なため別 plan。

ε (文言調整) は単体では弱いが、 ζ 等を入れても user 期待と乖離するなら一緒に。

---

## 引用元 / 関連 doc

- `docs/l3_phases/audit/DEV_REVIEW_R4_THREE_DEFECTS_2026-05-27.md` (PR #584、 §4 design feedback)
- `docs/l3_phases/audit/THEME_CLONE_AESTHETIC_LOST_2026-05-26.md` (F3 根治 audit、 builtin css_vars
  二重定義の sources of truth)
- `src-tauri/migrations/043_builtin_theme_css_vars_seed.sql` (実値 seed)
- `src/lib/styles/arcagate-theme.css` (静的 [data-theme] block、 brutalist の `body::before` rule)
- `src/lib/state/theme.svelte.ts:applyTheme` (inline reset の prefix list、 §4 C leak 元)
- `src/lib/utils/color.ts` (`AESTHETIC_RANGE` の random 生成レンジ)
