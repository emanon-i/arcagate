# Design Tokens

> cross-cutting / 規範本体は [`../../design-tokens.md`](../../design-tokens.md) (Design Tokens v2)

## 目的

「色は seed 1〜2 色から色彩学で自動派生、aesthetic (glass / neumorph / brutalist / HUD) は直交軸として token 化」という design system。component が見た目を書くときの token 選択基準を規定する。

## やること (必要処理)

- 3 層構成: LAYER 1 color seeds (`--c-*`) → LAYER 2 aesthetic primitives → LAYER 3 semantic tokens (`--ag-*`)
- LAYER 3 は `oklch(from …)` / `color-mix()` で runtime 派生 (base 非依存、light / dark 両対応)
- builtin theme 5 本 (Dark / Light / Neumorph / Brutalist / HUD) を seed + primitive の組合せで表現
- a11y override 3 トグル (透明度 / コントラスト / 動き) を `<html>` data 属性で反映

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
