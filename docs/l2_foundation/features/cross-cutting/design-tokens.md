# Design Tokens

> cross-cutting / 規範本体は [`../../design-tokens.md`](../../design-tokens.md) (Design Tokens v2)

## 目的

「色は seed 1〜2 色から色彩学で自動派生、aesthetic (glass / neumorph / brutalist) は直交軸として token 化」という design system。component が見た目を書くときの token 選択基準を規定する。 PH-CF-800 F1 で HUD は builtin から削除済。

## やること (必要処理)

- 3 層構成: LAYER 1 color seeds (`--c-*`) → LAYER 2 aesthetic primitives → LAYER 3 semantic tokens (`--ag-*`)
- LAYER 3 は `oklch(from …)` / `color-mix()` で runtime 派生 (base 非依存、light / dark 両対応)
- builtin theme 6 本 (3 系統 × Dark/Light = Dark / Light / Brutalist Dark / Brutalist / Neumorph Dark / Neumorph) を seed + primitive の組合せで表現 (PH-CF-800 F1、 migration 041)
- a11y override 3 トグル (透明度 / コントラスト / 動き) を `<html>` data 属性で反映

## 機能契約

### accent コントラスト契約 (PH-CF-800 F2)

全 builtin theme で `--c-primary` ベタ塗りの上に乗るテキストは **WCAG 4.5:1 以上** を保証する。 accent 面の表示テキストは `--ag-accent-text` トークン経由 (自動派生で「明背景には暗文字 / 暗背景には明文字」 を選ぶ) を徹底する。

旧 (PH-CF-800 以前): dark の `--c-primary` lightness が L0.78、 brutalist が L0.58、 neumorph が L0.66、 light が L0.62 で、 white-on-primary contrast が 1.3–4.0:1 に留まり違反していた。 PH-CF-800 F2 で全 6 builtin の `--c-primary` を L0.50 帯に調整し、 white-on-primary ≥ 4.5:1 を達成。

#### 機械検出

- frontend unit test `tests/contrast.test.ts`: builtin 6 本それぞれの `[data-theme]` block を probe DOM に適用し、 `--c-primary` と白文字 (`#ffffff`) の WCAG contrast 比が 4.5:1 以上であることを assert。

## やらないこと (禁止 / scope 外)

- component に生の見た目値 (hex / rgb / rgba / hsl / oklch / oklab、token 非経由の box-shadow 色) を書かない → `--ag-*` / `--c-*` 経由
- component から LAYER 1/2 を直接参照しない (LAYER 3 のみ)
- 色派生に JS fallback を持たない (WebView2 の CSS native 計算に委ねる)
- `src/lib/components/ui/` (shadcn scaffold) を手動編集しない
- 「Industrial Yellow」「Liquid Glass」表記を使わない (撤回 / 過去合意)

## 性能予算

- 派生は CSS runtime 計算。theme 切替は seed / aesthetic block の差し替えのみ

## 副作用 (state 変化 / persistence)

- custom theme は `themes.css_vars` (JSON) に seed override を保持
- a11y override は localStorage に永続化 (初回 paint 前に適用)

## 依存

- 実装: `src/lib/styles/arcagate-theme.css` / `src/lib/utils/color.ts` / `src/lib/state/a11y.svelte.ts`
- audit: `scripts/audit-design-tokens.sh` (pre-commit hook で hardcode 色を機械検出)
- backend: [Theme Service](../backend/theme-service.md)

## 既知の判断

- aesthetic の角丸 primitive は `--ag-radius-*` (Tailwind v4 が `--radius-*` namespace を予約済のため衝突回避)
- 詳細な token 一覧・選択基準は規範本体 [`../../design-tokens.md`](../../design-tokens.md) を参照
