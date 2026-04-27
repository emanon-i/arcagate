---
id: PH-20260428-487
title: 全 widget で横スクロールバー禁止 audit + fix
status: todo
batch: 108
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/common/WidgetShell.svelte
  - src/lib/widgets/clock/ClockWidget.svelte
  - src/lib/widgets/system-monitor/SystemMonitorWidget.svelte
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte
  - src/lib/widgets/file-search/FileSearchWidget.svelte
  - scripts/audit-no-horizontal-scrollbar.sh (new)
---

# PH-487: 全 widget で横スクロールバー禁止 audit + fix

## 背景

ユーザー dev fb (2026-04-28):

> 時計とかSystemモニタとかEXE Folderとかウィジットで横スクロールバー出るの嫌だな
> あとここもカーソル上下で〜（FileSearch でも横スクロール）
> ボタンとかでアイコンとか文字列はみ出るのやめてくれ。これも横スクロールバーでるし微妙

widget 内コンテンツが幅超過した際に横スクロールバーが表示される問題が複数 widget で発生。
横スクロールは widget UX として常に NG (縦のみ許可)。

## 受け入れ条件

### 機能

- [ ] **WidgetShell**: 内側 container に `overflow-x-hidden` 強制 (overflow-y は auto 維持)
- [ ] **clock / system-monitor / exe-folder / file-search**: 内部要素の `min-width` / 固定 px width を全 audit、`max-w-full` + `truncate` or `whitespace-nowrap overflow-hidden text-ellipsis` で width 内収める
- [ ] **長いラベル / パス**: `truncate` + `title=` (tooltip) で full text 確認可
- [ ] **アイコン + 文字併記**: `flex items-center gap-2 min-w-0` で 文字部分 `flex-1 truncate`
- [ ] **新 audit script** `scripts/audit-no-horizontal-scrollbar.sh`: widget folder 内で `overflow-x: scroll` `overflow-x: auto` `overflow-x-scroll` `overflow-x-auto` を検出 → 1 件で exit 1
- [ ] CI / lefthook に統合

### 横展開チェック

- [ ] WidgetShell 親側で `overflow-x: hidden` を強制すれば widget 内部の意図せぬ横スクロールも遮断できる
- [ ] favorites / recent / projects (LibraryCard reuse) も同 audit (PH-491 のはみ出し fix と整合)

### SFDIPOT

- **F**unction: widget 表示で横スクロールバー出ない
- **D**ata: 文字省略箇所は tooltip (`title` attr) で full 取得可
- **I**nterface: CSS のみ
- **O**perations: 縦スクロールは維持

## 実装ステップ

1. WidgetShell に `overflow-x-hidden` 追加 (内側 `min-h-0 flex-1 overflow-y-auto` の隣)
2. clock: 大きな time 文字が widget 幅超え → font-size を responsive (`text-ag-md` to `text-ag-lg` clamp)
3. system-monitor: 数値 + label が幅超え → `min-w-0 truncate`
4. exe-folder: ファイル名一覧の各行 `truncate` + `title={name}`
5. file-search: 検索結果 path の各行 `truncate` + `title={path}`
6. audit script 作成、lefthook + CI 統合
7. E2E 退行テスト追加 (各 widget で `scrollWidth <= clientWidth` assert) は scope 外、後 plan

## 規約参照

- 「同じパターンが他画面にもあれば一括で潰す」(CLAUDE.md 哲学)
- engineering-principles §6 (Function 観点)
