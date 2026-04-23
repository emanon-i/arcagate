---
id: PH-20260424-200
title: ItemForm UX 改善（アイコンプレビュー拡大・ターゲットヒント追加）
status: wip
priority: medium
parallel_safe: true
scope_files:
  - src/lib/components/item/ItemForm.svelte
---

## 背景

ユーザフィードバック:

- 「アイコン/サムネイル変更したら小さく中央に出るだけ」（item #20）
- 「ItemForm `Target =` の意味わからない」（item #19）

## 変更内容

### アイコンプレビュー拡大

- コンテナ h-12 w-12 → h-20 w-20
- アイコン h-10 w-10 → h-16 w-16

### ターゲットフィールドのヒント

- ローカルモード: placeholder 文字列を「ドラッグ＆ドロップ または 下のボタンで選択」に変更
- ラベル下にヒントテキスト追加: URL モード = 「ブラウザで開くURL」、ローカル = 「.exe/.bat/フォルダのパス」

## 受け入れ条件

- アイコン変更ダイアログでアイコンを選択すると、80×80px 相当のプレビューが見える
- ターゲットフィールドの下にヒントテキストが表示される
