---
id: PH-20260424-226
title: ThemeEditor 全変数カバレッジ拡張
status: done
priority: high
parallel_safe: false
scope_files:
  - src/lib/components/settings/ThemeEditor.svelte
depends_on: [PH-20260424-222]
---

## 目的

現状の ThemeEditor は theme.css_vars に入っている変数しか表示しない。
Endfield は ~22 変数、Dark/Light は 0 変数のため、radius/shadow/duration/ease 等が
UI から調整できない。

ALL_AG_VARS（51 変数）を定義し、css_vars にない変数は
getComputedStyle で現在の CSS 計算値をデフォルトとして埋め、
全変数をカテゴリ別に編集可能にする。

## 実装内容

1. `ALL_AG_VARS: string[]` を ThemeEditor 内に定義（51 変数）
2. `initEntries()`: ALL_AG_VARS を走査し、css_vars→computed style の優先順でデフォルト埋め
3. `entries` / `savedCssVars` を両方 `initEntries()` で初期化
4. `isDirty` ロジックは変更なし（entries vs savedCssVars 比較）
5. 保存時は全 entries を css_vars に書き込む

## 受け入れ条件

- [ ] 全 ~51 --ag-* 変数がグループ別に表示される
- [ ] Dark テーマ（css_vars='{}'）でも全変数が編集できる
- [ ] Endfield（22 変数）も既存値 + 残変数が埋まる
- [ ] 保存後リロードしても変数が保持される
- [ ] `pnpm verify` 全通過
