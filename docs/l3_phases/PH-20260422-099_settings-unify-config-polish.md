---
id: PH-20260422-099
title: Settings ボタン統一 + Config 画面洗練
status: wip
batch: 21
priority: high
created: 2026-04-22
---

## 背景/目的

Settings ボタンが TitleBar / LibrarySidebar / WorkspaceSidebar の3箇所に存在し冗長。
ユーザー決定（方針 B-X）により TitleBar の1つに統一する。
併せて Settings パネルの UI を洗練させ（セクションヘッダ・フォームコントロール統一）、
設定画面としての完成度を高める。

## 制約

- TitleBar の Settings ボタンは `src/routes/+page.svelte:189` にあり、維持する
- LibrarySidebar / WorkspaceSidebar のボタン削除後、Props 型も整理する
- Settings パネル自体は `src/lib/components/arcagate/common/SettingsPanel.svelte`

## 実装内容

### Part A: Settings ボタン削除（2箇所）

**LibrarySidebar.svelte**
- `onOpenSettings` prop を削除
- Settings2 import 削除
- Settings ボタン要素を削除
- 呼び出し元（+page.svelte 等）から `onOpenSettings` prop 渡しを削除

**WorkspaceSidebar.svelte**
- 同上（`onOpenSettings` prop 削除、Settings2 import 削除、ボタン削除）

### Part B: Settings パネル UI 洗練

`SettingsPanel.svelte` に以下の改善を加える：

1. **セクションヘッダ統一**: 各設定グループに `<h3>` ベースのヘッダ行を追加
   - 「一般」「テーマ」「ウィジェット」「データ」など
2. **フォームコントロール統一**: `<label>` + コントロールのレイアウトを
   `flex items-center justify-between` で揃える
3. **スクロールナビ**: パネルが長い場合、セクションジャンプ用アンカーリンクを
   パネル上部に表示（オプション：小さなサイドインデックス）

## 受け入れ条件

- [ ] LibrarySidebar に Settings ボタンが存在しない
- [ ] WorkspaceSidebar に Settings ボタンが存在しない
- [ ] TitleBar の Settings ボタンから Settings パネルが開く（回帰なし）
- [ ] Settings パネルにセクションヘッダが表示される
- [ ] フォームコントロールが縦に揃っている（左ラベル・右コントロール）
- [ ] `pnpm verify` 全通過
