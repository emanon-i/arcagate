---
id: PH-20260422-055
title: paletteStore selectedIndex 循環ナビゲーション
status: done
batch: 11
priority: medium
---

## 背景・目的

`selectNext()` / `selectPrev()` は現在両端でクランプ（停止）する。
Alfred / Raycast 等の一般的なパレット UX では両端を超えると反対端に循環する。

## 受け入れ条件

- [x] `selectNext()`: 末尾インデックスから呼ぶと先頭 (0) に戻る
- [x] `selectPrev()`: 先頭 (0) から呼ぶと末尾インデックスに循環する
- [x] 空結果では early return（変化なし）
- [x] 既存テストを循環動作に更新
  - "clamps at length-1" → "末尾から先頭に循環"
  - "clamps at 0" → "先頭から末尾に循環"

## 実装メモ

- `% results.length` による剰余演算で循環
- `selectPrev` に `results.length === 0` ガードを追加（以前はなかった）
- 計算式: `(i - 1 + n) % n` で負のモジュロを回避
