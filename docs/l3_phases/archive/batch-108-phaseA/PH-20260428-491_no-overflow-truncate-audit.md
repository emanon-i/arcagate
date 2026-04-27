---
id: PH-20260428-491
title: 全 widget/button/panel でアイコン+文字列はみ出し禁止 (truncate + tooltip + size 上限)
status: done
batch: 108
pr: 194
merged_at: 2026-04-27T17:17:38Z
note: audit-text-overflow.sh (warning 止まり、将来 error 化)
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/**/*.svelte
  - scripts/audit-text-overflow.sh (new)
---

# PH-491: アイコン+文字列はみ出し禁止 audit

## 背景

ユーザー dev fb (2026-04-28):

> ボタンとかでアイコンとか文字列はみ出るのやめてくれ。これも横スクロールバーでるし微妙
> あとサイズの上限とか加減とかちゃんと考えてくれる？

## 受け入れ条件

- [ ] **共通 pattern**: icon + text の配置は必ず `flex items-center gap-2 min-w-0` + icon `shrink-0` + text `flex-1 truncate`
- [ ] **長い text は tooltip**: `<span class="truncate" title={fullText}>{shortText}</span>`
- [ ] **button text はみ出し禁止**: button に `max-w-full` + 内 text `truncate`
- [ ] **panel header text**: `truncate` + tooltip
- [ ] **サイズ上限ルール統一**: tooltip / chip 等は `max-w-[200px]` 等で揃える
- [ ] **audit script** `scripts/audit-text-overflow.sh`: `flex items-center` を含むが `min-w-0` がない pattern を警告 (false positive 多めだが指針)
- [ ] CI 統合は optional (warning 止まり)

### 横展開チェック (全コンポーネント)

- [ ] LibraryCard: label `truncate` ✓ 既存
- [ ] WidgetHandles: × button text なし、aria-label のみ ✓
- [ ] PaletteSearchBar: input、長い query は OK
- [ ] ExeFolder file row: PH-490 で fix
- [ ] Settings dialog 各 row
- [ ] HelpPanel keys / description

### SFDIPOT

- F: text overflow なしで full text 取得可 (tooltip)
- D: CSS のみ
- O: hover で full text 表示 (a11y: aria-label or title)

## 実装ステップ

1. 全 widget / panel grep で `flex items-center` を探す → `min-w-0` 漏れ check
2. text container に `truncate` + parent に `min-w-0` 追加
3. icon は `shrink-0` 強制
4. audit script (rg 経由) で残存検出
5. CI 統合 (warning 止まり、後で error 化)

## 規約参照

- ux_standards.md (text overflow rule)
