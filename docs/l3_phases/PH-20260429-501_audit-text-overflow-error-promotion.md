---
id: PH-20260429-501
title: はみ出し audit を warning → error 化 + 違反個別 fix
status: done
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - scripts/audit-text-overflow.sh (warning → error)
  - lefthook.yml (or pre-push hook)
  - .github/workflows/ci.yml (audit step を CI 必須に)
  - src/lib/widgets/**/*.svelte (個別 fix)
  - src/lib/components/arcagate/**/*.svelte (個別 fix)
  - src/lib/components/settings/**/*.svelte (個別 fix)
---

# PH-501: はみ出し audit を warning → error 化 + 違反個別 fix

## 背景

ユーザー dev fb (2026-04-28、検収項目 #22):

> ボタンとかでアイコンとか文字列はみ出るのやめてくれ。これも横スクロールバーでるし微妙
> あとサイズの上限とか加減とかちゃんと考えてくれる？

batch-108 PH-491 で `scripts/audit-text-overflow.sh` を **warning 止まり** で実装。本 plan で **error 化 + 既存違反全件 fix**。

## 受け入れ条件

- [ ] **audit script error 化**: exit code 1 で fail、warning printf を error に
- [ ] **CI 必須 step 化**: `pnpm verify` に組み込み + GitHub Actions で audit step 追加 (lint job と並列可)
- [ ] **lefthook pre-push にも組み込み**: ローカルで先に検出
- [ ] **既存違反 0 件**: audit 一覧で出た違反を **全件 fix** (truncate / min-w-0 / max-width 設定)
- [ ] **Audit ルール明文化** (`docs/l1_requirements/ux_standards.md` に追記):
  - widget / panel / button 内の text 要素は `min-w-0` 必須 (parent flex)
  - text-rich element (label / span / p) は `truncate` or `break-words` を持つ
  - icon は `shrink-0` 必須
  - max-width 設定 (icon: 16-24px、text: 100% min-w-0)
- [ ] **回帰防止 spec**: 新規 widget 追加時に audit fail する事を Plan template に明記
- [ ] before/after スクショ (修正前後の widget render gallery)

## 実装ステップ

1. audit-text-overflow.sh を error mode に変更 (exit 1 on violations)
2. 現在の違反一覧を取得 → 個別 fix
3. lefthook + CI 統合
4. ux_standards.md にルール追記
5. E2E (visual regression 候補): 主要 widget (Item / WatchFolder / FileSearch / Task / ClipboardHistory) で長いテキストを入れて scrollbar 0 + truncate assert
6. before/after スクショ

## 規約参照

- ux_standards.md (truncate / min-w-0 / shrink-0)
- engineering-principles §4 可観測性 (lint で機械強制)
- batch-108 PH-491 の延長
