---
id: PH-20260422-100
title: ウィジェット実機体感の底上げ
status: wip
batch: 21
priority: medium
created: 2026-04-22
---

## 背景/目的

PH-098 の Canvas UX 再設計で拾いきれない細部の体感改善。
通常モード（非編集）でのウィジェット操作感を底上げし、
「毎日使いたいランチャー」としての磨き込みを行う。

## 制約

- 既存の Widget 実装（FavoritesWidget / ProjectsWidget / RecentLaunchesWidget）の
  ロジックは変更しない
- アニメーションは CSS transition のみ（JS アニメーションは使わない）

## 実装内容

### 1. ウィジェットホバー強調

現状は薄い hover スタイルのみ。
各ウィジェットの外枠コンテナに `transition-shadow hover:shadow-md` を追加し、
浮き上がり感を演出。

### 2. ドロップゾーン視覚改善（編集モード）

現在の `dragOverCell` ハイライトは背景色変更のみ。
ドロップ可能セルを `border-2 border-dashed border-[var(--ag-accent)]` で表示し、
「ここに置ける」感を明確化。

### 3. ウィジェット内アイテム hover フィードバック

FavoritesWidget / RecentLaunchesWidget のアイテム行に
`transition-colors duration-100` を追加してクリック応答を速く見せる。

### 4. 空ウィジェットの案内表示

ウィジェットにアイテムが0件の場合、空状態を示すテキスト/アイコンを表示。
（現状はただ空白のまま）
例: 「ライブラリからドラッグして追加」

## 受け入れ条件

- [ ] ウィジェットにホバーすると影が付く
- [ ] 編集モードのドロップゾーンが破線枠でハイライトされる
- [ ] アイテム行の hover 色変化が 100ms 以内に感じられる
- [ ] 空ウィジェットに案内テキストが表示される
- [ ] `pnpm verify` 全通過
