---
id: PH-20260427-475
title: Font Token 化 + 全 widget 一括適用 + audit script
status: done
batch: 107
era: polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/styles/tokens.css (new or extend arcagate-theme.css)
  - src/lib/components/arcagate/workspace/widgets/*.svelte
  - src/lib/components/arcagate/common/WidgetShell.svelte
  - scripts/audit-font-tokens.sh (new)
  - lefthook.yml / .github/workflows/check.yml
---

# PH-475: Font Token 化 + 全 widget 一括適用 + audit script

## 背景

ユーザー dev fb (2026-04-27):

> ウィジット全体的にフォントが小さい。フォントは大中小極小とかで統一感を持たせてください。
> てか普通そうだよね？smとかだよね？ハードコードしてないよね？

調査結果:

- Tailwind の `text-xs/sm/md/lg` は使われているが、Arcagate 独自 token (`--ag-font-*`) はない
- 一部 `text-[14px]` 等の hardcode が散在 (Explore 報告で 304 件相当)
- widget 内部のフォントサイズが視認性低い (xs 多用)

## 受け入れ条件

### 機能

- [x] **Token 定義**: arcagate-theme.css に `--ag-font-{xs,sm,md,lg,xl,2xl}` (11/13/15/18/22/28 px) + line-height ペアを追加
- [x] **Tailwind v4 export**: app.css `@theme inline` に `--text-ag-*` + `--text-ag-*--line-height` を追加 → `text-ag-md` 等が Tailwind class として使える
- [x] **Widget 全体置換**: `src/lib/widgets/` 配下の `text-{xs,sm,base,lg,xl}` を `text-ag-{xs,sm,md,lg,xl}` に sed 一括置換 (138 件→ 0 件残存)
- [x] **WidgetShell**: タイトルを `text-ag-md font-semibold` に変更
- [x] **Audit script** `scripts/audit-font-tokens.sh`: text-{xs,sm,base,lg,xl,2xl} + text-[Npx] を検出、widget paths のみ scope、違反 1 件で exit 1
- [x] **CI 統合**: .github/workflows/ci.yml に「Font token audit (PH-475)」step 追加
- [x] **lefthook 統合**: pre-commit に `font-tokens` command 追加 (widget glob)

### 横展開チェック

- [x] Library / Settings / Theme editor は scope 外 (今回 widget だけに集中、後続 batch で展開予定)
- [x] WidgetShell の text-sm → text-ag-md でタイトル可読性向上
- [x] HintBar / Toast 等の共通コンポーネントは将来 batch で展開 (現状 audit script 対象外、grep で残存確認済み)

### SFDIPOT

- **F**unction: テーマ切替 (light/dark) で font も読みやすさ維持
- **D**ata: CSS 変数で集約、JS / Svelte 内で px 直書き禁止
- **I**nterface: Tailwind class で参照、`text-ag-*` の API
- **P**latform: WebView2 で CSS var 描画 OK
- **O**perations: 開発者が新 widget 作成時に `text-xs` 等を書いたら audit script で fail

### HICCUPPS

- [Image] Material Design type scale / iOS Dynamic Type の階層感
- [Consistency] 全 widget で同じ階層 (タイトル / 本文 / 補足) を使う

## 実装ステップ

1. `arcagate-theme.css` に `--ag-font-{xs,sm,md,lg,xl,2xl}` 追加 (line-height ペア)
2. `tailwind.config.js` の `theme.extend.fontSize` に `ag-*` token を追加
3. widget 配下を grep → 一括置換 sed (確認しながら)、px 直書きは個別判断
4. WidgetShell.svelte の text-sm → text-ag-md (タイトル)、補足 → text-ag-sm
5. `scripts/audit-font-tokens.sh` 作成: ripgrep で違反パターン検出、結果出力 + exit code
6. `pnpm verify:font-tokens` script を package.json に追加、`pnpm verify` チェーンに組み込む
7. lefthook pre-commit に audit 追加
8. E2E: visual regression 用に screenshot だけ取り直し (font size 変化確認)

## 規約参照

- ux_standards.md typography section
- engineering-principles §6 (機械化に落とす)

## 参考

- arcagate-theme.css (既存 `--ag-*` 体系)
- audit-widget-coverage.sh (script の参考実装)
