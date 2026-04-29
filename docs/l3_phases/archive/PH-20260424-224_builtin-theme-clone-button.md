---
id: PH-20260424-224
title: ビルトインテーマ「コピーして編集」ボタン
status: done
priority: high
parallel_safe: false
scope_files:
  - src/lib/components/settings/SettingsPanel.svelte
depends_on: [PH-20260424-222]
---

## 目的

Endfield / Ubuntu Frosted / Liquid Glass などのビルトインテーマカードに
「コピーして編集」ボタンを追加し、クリック一発でそのテーマをベースに
ThemeEditor を開けるようにする。

現状: `is_builtin=true` のテーマには「エクスポート」しかなく、
カスタマイズしたい場合は「現在のテーマを複製」ボタンの存在に
気づく必要があって UX が悪い。

## 実装内容

1. `cloneCurrentTheme()` を汎用化して `cloneTheme(sourceId: string)` に
   （引数なしの呼び出しは現状の activeMode からの複製に保持）
2. ビルトインテーマカード（`is_builtin=true`）の下に小さな
   「コピーして編集」ボタンを追加
3. ヘッダーの「現在のテーマを複製」は引き続き残す

## 受け入れ条件

- [ ] Endfield / Ubuntu Frosted / Liquid Glass のカードに「コピーして編集」が表示される
- [ ] クリックするとそのテーマのコピーが作成され ThemeEditor が自動展開する
- [ ] E2E: Endfield の「コピーして編集」でテーマエディタが開くこと
- [ ] `pnpm verify` 全通過
