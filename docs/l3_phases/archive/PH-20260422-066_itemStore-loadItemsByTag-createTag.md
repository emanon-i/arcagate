---
id: PH-20260422-066
title: itemStore loadItemsByTag / createTag テスト追加
status: done
batch: 13
---

## 目的

itemStore の loadItemsByTag と createTag の IPC テストを追加。

## 受け入れ条件

- loadItemsByTag() → tagItems 配列に結果が格納される
- createTag() → tags 配列にタグが追加される

## 検証

- pnpm verify 通過
